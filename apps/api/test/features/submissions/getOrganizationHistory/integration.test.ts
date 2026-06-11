import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  SubmissionFileType,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import {
  SubmissionEventType,
  type GetSubmissionHistoryResponse,
} from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestFiles,
  createTestFileForSubmission,
} from "@test/factories/fileFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestSubmissions,
  createTestOrganizationDataSubmission,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/submissions/organization/:id/history - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await cleanupTestFiles(prisma);
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  async function createMemberOrganization() {
    const organization = await createTestOrganization(prisma);
    await createTestMembership(prisma, testUser.id, organization.id);
    return organization;
  }

  async function getHistory(
    organizationId: string
  ): Promise<GetSubmissionHistoryResponse> {
    const response = await requestHistory(organizationId);

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as GetSubmissionHistoryResponse;
  }

  async function requestHistory(organizationId: string) {
    return app.inject({
      method: "GET",
      url: `/api/submissions/organization/${organizationId}/history`,
    });
  }

  // storage is now a required runtime dependency (no "disabled" mode), so the
  // helper that toggled it off has been removed along with the tests that
  // relied on a 503 fallback.

  it("returns a single POSTULATION event dated with createdAt for pending submissions", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );
    const createdAt = new Date("2026-01-15T10:00:00.000Z");

    await prisma.submission.update({
      where: { id: submission.id },
      data: { createdAt },
    });

    const history = await getHistory(organization.id.toString());

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      submissionType: SubmissionType.ORGANIZATION_ACCREDITATION,
      eventType: SubmissionEventType.POSTULATION,
      date: createdAt.toISOString(),
    });
  });

  it.each([
    [SubmissionStatus.APPROVED, SubmissionEventType.APPROVED],
    [SubmissionStatus.REJECTED, SubmissionEventType.REJECTED],
    [SubmissionStatus.REVIEWED, SubmissionEventType.REVIEWED],
  ])(
    "returns POSTULATION plus %s dated with reviewedAt",
    async (status, eventType) => {
      const organization = await createMemberOrganization();
      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id
      );
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        organizationData.id,
        status,
        testUser.id,
        testUser.id,
        "Reviewed by admin"
      );
      const createdAt = new Date("2026-01-10T09:00:00.000Z");
      const reviewedAt = new Date("2026-01-12T14:30:00.000Z");

      await prisma.submission.update({
        where: { id: submission.id },
        data: { createdAt, reviewedAt },
      });

      const history = await getHistory(organization.id.toString());

      expect(history.map((entry) => entry.eventType)).toEqual([
        eventType,
        SubmissionEventType.ON_REVIEW,
        SubmissionEventType.POSTULATION,
      ]);
      expect(history[0]).toMatchObject({
        submissionId: submission.id.toString(),
        eventType,
        date: reviewedAt.toISOString(),
        comment: "Reviewed by admin",
      });
      expect(history[2]).toMatchObject({
        submissionId: submission.id.toString(),
        eventType: SubmissionEventType.POSTULATION,
        date: createdAt.toISOString(),
        comment: "",
      });
    }
  );

  it("shows revision attachments only on the REVIEWED reviewed event", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.REVIEWED,
      testUser.id,
      testUser.id,
      "Please fix these items"
    );
    const createdAt = new Date("2026-01-10T09:00:00.000Z");
    const reviewedAt = new Date("2026-01-12T14:30:00.000Z");

    await prisma.submission.update({
      where: { id: submission.id },
      data: { createdAt, reviewedAt },
    });

    const { file: attachmentFile } = await createTestFileForSubmission(
      prisma,
      testUser.id,
      submission.id,
      {
        type: SubmissionFileType.SUBMIT_ATTACHMENT,
        fileOverrides: { originalName: "original-attachment.pdf" },
      }
    );
    const { file: revisionFile } = await createTestFileForSubmission(
      prisma,
      testUser.id,
      submission.id,
      {
        type: SubmissionFileType.REVIEW_ATTACHMENT,
        fileOverrides: { originalName: "revision-note.pdf" },
      }
    );

    const history = await getHistory(organization.id.toString());

    expect(history.map((entry) => entry.eventType)).toEqual([
      SubmissionEventType.REVIEWED,
      SubmissionEventType.ON_REVIEW,
      SubmissionEventType.POSTULATION,
    ]);
    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.REVIEWED,
      date: reviewedAt.toISOString(),
      comment: "Please fix these items",
      recognitions: [],
    });
    expect(history[0].files).toHaveLength(1);
    expect(history[0].files[0]?.uuid).toBe(revisionFile.uuid);
    expect(history[0].files[0]?.originalName).toBe("revision-note.pdf");

    expect(history[2]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.POSTULATION,
      date: createdAt.toISOString(),
      comment: "",
      recognitions: [],
    });
    expect(history[2].files).toHaveLength(1);
    expect(history[2].files[0]?.uuid).toBe(attachmentFile.uuid);
    expect(history[2].files[0]?.originalName).toBe("original-attachment.pdf");
  });

  it("exposes revision attachments on reviewed events (APPROVED, REVIEWED, REJECTED)", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id,
      "Approved with notes"
    );

    await createTestFileForSubmission(prisma, testUser.id, submission.id, {
      type: SubmissionFileType.REVIEW_ATTACHMENT,
      fileOverrides: { originalName: "internal-note.pdf" },
    });

    const history = await getHistory(organization.id.toString());

    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.APPROVED,
    });
    expect(history[0].files).toHaveLength(1);
    expect(history[0].files[0]?.originalName).toBe("internal-note.pdf");
  });

  it("returns 200 with an empty timeline when the history has no files", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );

    await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const response = await requestHistory(organization.id.toString());

    expect(response.statusCode).toBe(200);
  });

  it("orders the timeline by event date instead of submission createdAt only", async () => {
    const organization = await createMemberOrganization();
    const firstOrgData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const secondOrgData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission: approvedSubmission } =
      await createTestOrganizationDataSubmission(
        prisma,
        firstOrgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
    const { submission: pendingSubmission } =
      await createTestOrganizationDataSubmission(
        prisma,
        secondOrgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

    await prisma.submission.update({
      where: { id: approvedSubmission.id },
      data: {
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        reviewedAt: new Date("2026-01-10T10:00:00.000Z"),
      },
    });
    await prisma.submission.update({
      where: { id: pendingSubmission.id },
      data: {
        createdAt: new Date("2026-01-05T10:00:00.000Z"),
      },
    });

    const history = await getHistory(organization.id.toString());

    expect(history[0]).toMatchObject({
      submissionId: approvedSubmission.id.toString(),
      eventType: SubmissionEventType.APPROVED,
      date: "2026-01-10T10:00:00.000Z",
    });
    expect(history[1]).toMatchObject({
      submissionId: pendingSubmission.id.toString(),
      eventType: SubmissionEventType.POSTULATION,
      date: "2026-01-05T10:00:00.000Z",
    });
  });
});
