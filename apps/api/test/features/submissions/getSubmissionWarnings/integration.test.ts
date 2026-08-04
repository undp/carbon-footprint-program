import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  OrganizationDataStatus,
  OrganizationStatus,
  SubmissionStatus,
  SubmissionType,
  SystemRole,
} from "@repo/database";
import {
  OrganizationDisplayStatusValues,
  type GetSubmissionWarningsResponse,
  type OrganizationIdentityCollisionMetadata,
  WarningType,
} from "@repo/types";
import { randomUUID } from "crypto";
import { createTestApp } from "@test/factories/appFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  createTestOrganizationDataSubmission,
  createTestSubmission,
  createTestSubmissionSubjectForOrganizationData,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

type Identity = {
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
};

describe("GET /api/admin/submissions/:id/warnings - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  // Distinct, unique-per-call identity so seeded data never collides accidentally.
  function uniqueIdentity(): Identity {
    const token = randomUUID();
    return {
      legalName: `Legal ${token}`,
      tradeName: `Trade ${token}`,
      taxId: `TAX-${token}`,
    };
  }

  async function createOrgDataSubmission(
    identity: Identity,
    status: SubmissionStatus,
    dataStatus: OrganizationDataStatus = OrganizationDataStatus.ACTIVE
  ) {
    const org = await createTestOrganization(prisma);
    const orgData = await createTestOrganizationData(prisma, org.id, {
      legalName: identity.legalName,
      tradeName: identity.tradeName,
      taxId: identity.taxId,
      status: dataStatus,
    });
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      orgData.id,
      status,
      testUser.id,
      status === SubmissionStatus.PENDING ? undefined : testUser.id
    );
    return { org, orgData, submission };
  }

  /** Creates the applicant: a PENDING accreditation submission with a known identity. */
  async function createApplicant(identity: Identity) {
    const { org, submission } = await createOrgDataSubmission(
      identity,
      SubmissionStatus.PENDING
    );
    return {
      applicantOrg: org,
      applicantSubmissionId: submission.id.toString(),
    };
  }

  async function getWarnings(
    submissionId: string
  ): Promise<GetSubmissionWarningsResponse> {
    const response = await app.inject({
      method: "GET",
      url: `/api/admin/submissions/${submissionId}/warnings`,
    });
    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as GetSubmissionWarningsResponse;
  }

  function meta(
    warning: GetSubmissionWarningsResponse[number]
  ): OrganizationIdentityCollisionMetadata {
    return warning.metadata as unknown as OrganizationIdentityCollisionMetadata;
  }

  it("returns an empty array when no identity field collides", async () => {
    const { applicantSubmissionId } = await createApplicant(uniqueIdentity());
    // An unrelated org that shares nothing with the applicant.
    await createOrgDataSubmission(uniqueIdentity(), SubmissionStatus.APPROVED);

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toEqual([]);
  });

  it("flags a legal-name collision with an accredited org (APPROVED, case-insensitive)", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    // Same legal name (lowercased → proves case-insensitivity), different tradeName/taxId.
    const conflicting = {
      legalName: applicant.legalName.toLowerCase(),
      tradeName: `Trade ${randomUUID()}`,
      taxId: `TAX-${randomUUID()}`,
    };
    const { org } = await createOrgDataSubmission(
      conflicting,
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe(WarningType.ORGANIZATION_IDENTITY_COLLISION);
    const m = meta(warnings[0]);
    expect(m.collisionState).toBe("APPROVED");
    expect(m.organizationId).toBe(org.id.toString());
    expect(m.collisionFields).toEqual(["legalName"]);
    expect(m.organizationStatus).toBe(
      OrganizationDisplayStatusValues.ACCREDITED
    );
    // The payload is structure only — no prose. The Spanish sentence is composed
    // by the client (see collisionCopy.test.ts).
    expect(warnings[0]).not.toHaveProperty("message");
    expect(m.taxId).toBe(conflicting.taxId);
    // Both sides of the comparison come from the payload: the applicant tuple is
    // the snapshot the endpoint actually matched on, not the org's displayed row.
    expect(m.applicant).toEqual({
      legalName: applicant.legalName,
      tradeName: applicant.tradeName,
      taxId: applicant.taxId,
      submissionStatus: SubmissionStatus.PENDING,
      // A first-time applicant: its own organization is not inscribed yet.
      organizationStatus: OrganizationDisplayStatusValues.NOT_ACCREDITED,
    });
  });

  it("flags a trade-name collision with a pending submission (PENDING)", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    const conflicting = {
      legalName: `Legal ${randomUUID()}`,
      tradeName: applicant.tradeName,
      taxId: `TAX-${randomUUID()}`,
    };
    const { org } = await createOrgDataSubmission(
      conflicting,
      SubmissionStatus.PENDING
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionState).toBe("PENDING");
    expect(m.organizationId).toBe(org.id.toString());
    expect(m.collisionFields).toEqual(["tradeName"]);
    // A pending collision usually comes from an organization that is not
    // inscribed yet — the payload must not claim otherwise.
    expect(m.organizationStatus).toBe(
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    );
    expect(m.taxId).toBe(conflicting.taxId);
  });

  it("marks a pending collision as inscribed when that organization is already accredited", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    // An inscribed organization editing its data: approved v1 (no collision) and
    // a pending v2 that collides. The organization IS accredited, the colliding
    // submission is pending.
    const conflictingOrg = await createTestOrganization(prisma);
    const approvedV1 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      { ...uniqueIdentity(), status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    const pendingV2 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: applicant.legalName,
        tradeName: `Trade ${randomUUID()}`,
        taxId: `TAX-${randomUUID()}`,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      pendingV2.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionState).toBe("PENDING");
    expect(m.organizationStatus).toBe(
      OrganizationDisplayStatusValues.ACCREDITED
    );
    expect(m.collisionFields).toEqual(["legalName"]);
  });

  it("reports the applicant's own organization as inscribed when it is already accredited", async () => {
    // The applicant is an inscribed organization editing its data: an approved v1
    // with an unrelated identity, plus the pending v2 under review.
    const applicantOrg = await createTestOrganization(prisma);
    const approvedV1 = await createTestOrganizationData(
      prisma,
      applicantOrg.id,
      { ...uniqueIdentity(), status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    const applicant = uniqueIdentity();
    const pendingV2 = await createTestOrganizationData(
      prisma,
      applicantOrg.id,
      { ...applicant, status: OrganizationDataStatus.ACTIVE }
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      pendingV2.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    // Another organization whose approved snapshot shares the applicant's taxId.
    await createOrgDataSubmission(
      { ...uniqueIdentity(), taxId: applicant.taxId },
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(submission.id.toString());

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionFields).toEqual(["taxId"]);
    // The applicant's standing is its own fact, independent of its submission
    // being PENDING and of the conflicting organization's standing.
    expect(m.applicant.submissionStatus).toBe(SubmissionStatus.PENDING);
    expect(m.applicant.organizationStatus).toBe(
      OrganizationDisplayStatusValues.ACCREDITED
    );
  });

  it("flags a tax-id (RUT) collision", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    const conflicting = {
      legalName: `Legal ${randomUUID()}`,
      tradeName: `Trade ${randomUUID()}`,
      taxId: applicant.taxId,
    };
    const { org } = await createOrgDataSubmission(
      conflicting,
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionFields).toEqual(["taxId"]);
    expect(m.organizationId).toBe(org.id.toString());
    expect(m.taxId).toBe(applicant.taxId);
  });

  it("excludes the applicant's own organization (prior approved snapshot with matching values)", async () => {
    const identity = uniqueIdentity();
    const applicantOrg = await createTestOrganization(prisma);

    // Prior APPROVED snapshot for the SAME org, same identity.
    const approvedData = await createTestOrganizationData(
      prisma,
      applicantOrg.id,
      { ...identity, status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedData.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    // The applicant: a new PENDING edition of the same org, same identity.
    const pendingData = await createTestOrganizationData(
      prisma,
      applicantOrg.id,
      { ...identity, status: OrganizationDataStatus.ACTIVE }
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      pendingData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const warnings = await getWarnings(submission.id.toString());

    expect(warnings).toEqual([]);
  });

  it("matches the approved snapshot even when the displayed (pending) row differs", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    // Conflicting org: approved v1 collides on legalName; pending v2 does NOT.
    const conflictingOrg = await createTestOrganization(prisma);
    const approvedV1 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: applicant.legalName,
        tradeName: `Trade ${randomUUID()}`,
        taxId: `TAX-${randomUUID()}`,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    const pendingV2 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      { ...uniqueIdentity(), status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      pendingV2.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionState).toBe("APPROVED");
    expect(m.organizationId).toBe(conflictingOrg.id.toString());
    // The tuple must be the APPROVED snapshot's, not the displayed pending row's.
    expect(m.legalName).toBe(applicant.legalName);
    expect(m.collisionFields).toEqual(["legalName"]);
  });

  it("returns two warnings (APPROVED before PENDING) when one org collides in both states", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    const conflictingOrg = await createTestOrganization(prisma);
    const approvedV1 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      { ...applicant, status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );
    const pendingV2 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      { ...applicant, status: OrganizationDataStatus.ACTIVE }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      pendingV2.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(2);
    expect(meta(warnings[0]).collisionState).toBe("APPROVED");
    expect(meta(warnings[1]).collisionState).toBe("PENDING");
    expect(meta(warnings[0]).organizationId).toBe(conflictingOrg.id.toString());
    expect(meta(warnings[1]).organizationId).toBe(conflictingOrg.id.toString());
  });

  it("reports a blocked organization as blocked, not as inscribed", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    // Blocking does not touch the approved snapshot, so this org still collides
    // through the APPROVED branch. `is_accredited` is blind to BLOCKED, which is
    // why the standing has to come from `display_status`.
    const blockedOrg = await createTestOrganization(prisma, {
      status: OrganizationStatus.BLOCKED,
    });
    const orgData = await createTestOrganizationData(prisma, blockedOrg.id, {
      legalName: applicant.legalName,
      tradeName: `Trade ${randomUUID()}`,
      taxId: `TAX-${randomUUID()}`,
      status: OrganizationDataStatus.ACTIVE,
    });
    await createTestOrganizationDataSubmission(
      prisma,
      orgData.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.organizationId).toBe(blockedOrg.id.toString());
    expect(m.collisionState).toBe("APPROVED");
    expect(m.organizationStatus).toBe(OrganizationDisplayStatusValues.BLOCKED);
  });

  it("compares only against the organization's current approved snapshot", async () => {
    // Approving never marks the prior approved snapshot OUTDATED, so an org that
    // edited and was re-approved holds two ACTIVE+APPROVED snapshots. Only the
    // newest is its identity — `organization_summary_view` resolves the displayed
    // row the same way. Here v1 collides on legalName + taxId and v2, the current
    // one, only on legalName.
    const applicant = {
      legalName: `Legal ${randomUUID()}`,
      tradeName: `Trade ${randomUUID()}`,
      taxId: `TAX-${randomUUID()}`,
    };
    const { applicantSubmissionId } = await createApplicant(applicant);

    const conflictingOrg = await createTestOrganization(prisma);
    const approvedV1 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: applicant.legalName,
        tradeName: `Trade ${randomUUID()}`,
        taxId: applicant.taxId,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );
    // Newer, but a strictly smaller collision set: it must not represent v1's.
    const approvedV2 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: applicant.legalName,
        tradeName: `Trade ${randomUUID()}`,
        taxId: `TAX-${randomUUID()}`,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV2.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    const warnings = await getWarnings(applicantSubmissionId);

    // Only v2 — the organization's CURRENT approved identity — is compared. The
    // taxId clash lives in v1, which the organization no longer holds, so it is
    // not reported: warning about it would claim the org is registered under a
    // tax id it superseded.
    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    expect(m.collisionFields).toEqual(["legalName"]);
    expect(m.legalName).toBe(applicant.legalName);
    expect(m.taxId).toBe(approvedV2.taxId);
    expect(m.taxId).not.toBe(applicant.taxId);

    // The invariant, stated directly: each colliding field matches on both sides.
    m.collisionFields.forEach((field) => {
      expect(m[field]?.toLowerCase()).toBe(
        m.applicant[field]?.toLowerCase() ?? null
      );
    });
  });

  it("returns nothing when only a superseded approved snapshot collides", async () => {
    const applicant = {
      legalName: `Legal ${randomUUID()}`,
      tradeName: `Trade ${randomUUID()}`,
      taxId: `TAX-${randomUUID()}`,
    };
    const { applicantSubmissionId } = await createApplicant(applicant);

    const conflictingOrg = await createTestOrganization(prisma);
    // v1 shares the applicant's taxId, v2 — the current approved identity —
    // shares nothing. The organization dropped that tax id, so there is no
    // collision to report against the registry as it stands today.
    const approvedV1 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: `Legal ${randomUUID()}`,
        tradeName: `Trade ${randomUUID()}`,
        taxId: applicant.taxId,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV1.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );
    const approvedV2 = await createTestOrganizationData(
      prisma,
      conflictingOrg.id,
      {
        legalName: `Legal ${randomUUID()}`,
        tradeName: `Trade ${randomUUID()}`,
        taxId: `TAX-${randomUUID()}`,
        status: OrganizationDataStatus.ACTIVE,
      }
    );
    await createTestOrganizationDataSubmission(
      prisma,
      approvedV2.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id
    );

    // The candidate prefilter DOES find this organization (v1 matches), so this
    // also covers the re-read legitimately finding no collision at all.
    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toEqual([]);
  });

  it("returns one warning per conflicting organization", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    const { org: orgA } = await createOrgDataSubmission(
      {
        legalName: applicant.legalName,
        tradeName: `Trade ${randomUUID()}`,
        taxId: `TAX-${randomUUID()}`,
      },
      SubmissionStatus.APPROVED
    );
    const { org: orgB } = await createOrgDataSubmission(
      {
        legalName: `Legal ${randomUUID()}`,
        tradeName: `Trade ${randomUUID()}`,
        taxId: applicant.taxId,
      },
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(2);
    const orgIds = warnings.map((w) => meta(w).organizationId).sort();
    expect(orgIds).toEqual([orgA.id.toString(), orgB.id.toString()].sort());
  });

  it("skips null identity fields instead of matching them against each other", async () => {
    const legalName = `Legal ${randomUUID()}`;
    const { applicantSubmissionId } = await createApplicant({
      legalName,
      tradeName: null,
      taxId: null,
    });

    // Shares only the nulls — a null is not an identity, so nothing must collide.
    await createOrgDataSubmission(
      { legalName: `Legal ${randomUUID()}`, tradeName: null, taxId: null },
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toEqual([]);
  });

  it("exposes a null taxId for a conflicting org that has none", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    await createOrgDataSubmission(
      { legalName: applicant.legalName, tradeName: null, taxId: null },
      SubmissionStatus.APPROVED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toHaveLength(1);
    const m = meta(warnings[0]);
    // The client falls back to «legalName» when there is no tax id, so the tuple
    // has to carry both (see collisionCopy.test.ts).
    expect(m.taxId).toBeNull();
    expect(m.legalName).toBe(applicant.legalName);
  });

  it("ignores OUTDATED organization data", async () => {
    const applicant = uniqueIdentity();
    const { applicantSubmissionId } = await createApplicant(applicant);

    await createOrgDataSubmission(
      { ...applicant },
      SubmissionStatus.APPROVED,
      OrganizationDataStatus.OUTDATED
    );

    const warnings = await getWarnings(applicantSubmissionId);

    expect(warnings).toEqual([]);
  });

  it("returns 403 for a non-admin user", async () => {
    const { applicantSubmissionId } = await createApplicant(uniqueIdentity());

    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: `/api/admin/submissions/${applicantSubmissionId}/warnings`,
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: testUser.role },
      });
    }
  });

  it("returns 404 for an unknown submission id", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/admin/submissions/999999999/warnings`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns an empty array for a non-accreditation submission type", async () => {
    const org = await createTestOrganization(prisma);
    const orgData = await createTestOrganizationData(prisma, org.id);
    const subject = await createTestSubmissionSubjectForOrganizationData(
      prisma,
      orgData.id
    );
    const submission = await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      { status: SubmissionStatus.PENDING, createdById: testUser.id }
    );

    const warnings = await getWarnings(submission.id.toString());

    expect(warnings).toEqual([]);
  });
});
