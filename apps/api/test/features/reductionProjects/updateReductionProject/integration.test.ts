import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import {
  setupReductionProjectPrerequisites,
  buildUpdateReductionProjectPayload,
  createTestReductionProject,
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import {
  SubmissionStatus,
  SubmissionType,
  OrganizationStatus,
  MembershipStatus,
} from "@repo/database";
import { GwpSourceEnum } from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

describe("PATCH /api/reduction-projects/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupReductionProjectTestData(prisma);
  });

  async function countVerificationSubmissions(reductionProjectId: bigint) {
    return prisma.submission.count({
      where: {
        type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
        subject: { reductionProject: { reductionProjectId } },
      },
    });
  }

  describe("Successful update", () => {
    it("should update a DRAFT project, return 200 with null body, and persist the fields", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });
      // No submission = DRAFT.

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        { name: "Updated Draft Name", description: "Updated description" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("null");

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.name).toBe("Updated Draft Name");
      expect(updated?.description).toBe("Updated description");

      // Update never creates a submission.
      expect(await countVerificationSubmissions(project.id)).toBe(0);
    });

    it("should update a REVIEWED project without creating a new submission", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.REVIEWED,
        testUserId
      );

      const submissionCountBefore = await countVerificationSubmissions(
        project.id
      );

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        {
          name: "New Name",
          description: "New description",
          gwpUsed: GwpSourceEnum.IPCC_AR6,
          year: 2025,
          baselineScenario: 2000,
          projectScenario: 1500,
        }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.name).toBe("New Name");
      expect(updated?.description).toBe("New description");
      expect(updated?.gwpUsed).toBe(GwpSourceEnum.IPCC_AR6);
      expect(updated?.year).toBe(2025);

      // Explicitly assert no new submission was created by the update.
      const submissionCountAfter = await countVerificationSubmissions(
        project.id
      );
      expect(submissionCountAfter).toBe(submissionCountBefore);
      expect(submissionCountAfter).toBe(1);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when required fields are missing", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "Just name" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });

  describe("Business logic errors", () => {
    it("should return 422 REDUCTION_PROJECT_NOT_UPDATABLE when displayStatus is SUBMITTED", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.PENDING,
        testUserId
      );

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_UPDATABLE");
    });

    it("should return 422 REDUCTION_PROJECT_NOT_UPDATABLE when displayStatus is APPROVED", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.APPROVED,
        testUserId
      );

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_UPDATABLE");
    });
  });

  describe("Carbon inventory ownership guard", () => {
    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when the new carbonInventoryId belongs to a different organization (no re-parent)", async () => {
      const {
        organization: orgA,
        carbonInventory: ciA,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgA.id,
        carbonInventoryId: ciA.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Org B's inventory — organizationId in the payload stays A.
      const { carbonInventory: ciB } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const payload = buildUpdateReductionProjectPayload(
        orgA.id.toString(),
        ciB.id.toString(),
        subcategory.id.toString(),
        { name: "Cross-org CI attempt" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");

      const unchanged = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(unchanged?.carbonInventoryId).toBe(ciA.id);
    });

    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when re-parenting but keeping the source org's carbon inventory", async () => {
      const {
        organization: orgA,
        carbonInventory: ciA,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgA.id,
        carbonInventoryId: ciA.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Caller also belongs to org B (as CONTRIBUTOR/ADMIN).
      const { organization: orgB } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const payload = buildUpdateReductionProjectPayload(
        orgB.id.toString(),
        ciA.id.toString(),
        subcategory.id.toString(),
        { name: "Re-parent with stale CI" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");

      const unchanged = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(unchanged?.organizationId).toBe(orgA.id);
      expect(unchanged?.carbonInventoryId).toBe(ciA.id);
    });
  });

  describe("Cross-org IDOR regression", () => {
    it("should return 403 when the caller is a CONTRIBUTOR of a different org and NOT a member of the project's org", async () => {
      // Project lives in org B.
      const {
        organization: orgB,
        carbonInventory: ciB,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgB.id,
        carbonInventoryId: ciB.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Caller's membership is in org B — remove it, then give them a
      // membership in an unrelated org A instead.
      await prisma.userOrganizationMembership.deleteMany({
        where: { userId: testUserId, organizationId: orgB.id },
      });

      // Caller is only granted a fresh CONTRIBUTOR membership in an
      // unrelated org A here (used only to establish "member of a different
      // org", not referenced further).
      await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildUpdateReductionProjectPayload(
        orgB.id.toString(),
        ciB.id.toString(),
        subcategory.id.toString(),
        { name: "IDOR attempt" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Re-parenting", () => {
    it("should allow re-parenting to an org the caller belongs to and persist the new organizationId", async () => {
      const {
        organization: orgA,
        carbonInventory: ciA,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgA.id,
        carbonInventoryId: ciA.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Caller also belongs to org B (as CONTRIBUTOR/ADMIN).
      const { organization: orgB, carbonInventory: ciB } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildUpdateReductionProjectPayload(
        orgB.id.toString(),
        ciB.id.toString(),
        subcategory.id.toString(),
        { name: "Re-parented" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.organizationId).toBe(orgB.id);
      expect(updated?.carbonInventoryId).toBe(ciB.id);
    });

    it("should return 403 REDUCTION_PROJECT_ORGANIZATION_FORBIDDEN when re-parenting to an org the caller is not a member of", async () => {
      const {
        organization: orgA,
        carbonInventory: ciA,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgA.id,
        carbonInventoryId: ciA.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Org C exists but the caller has no membership there.
      const {
        organization: orgC,
        carbonInventory: ciC,
        membership: orgCMembership,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);
      // Remove the caller's membership from org C so they are NOT a member.
      await prisma.userOrganizationMembership.delete({
        where: { id: orgCMembership.id },
      });

      const payload = buildUpdateReductionProjectPayload(
        orgC.id.toString(),
        ciC.id.toString(),
        subcategory.id.toString(),
        { name: "Forbidden re-parent attempt" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_ORGANIZATION_FORBIDDEN");

      const unchanged = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(unchanged?.organizationId).toBe(orgA.id);
    });

    it("should return 403 REDUCTION_PROJECT_ORGANIZATION_FORBIDDEN when re-parenting to an org whose status is not ACTIVE, even with an ACTIVE CONTRIBUTOR membership there", async () => {
      const {
        organization: orgA,
        carbonInventory: ciA,
        subcategory,
      } = await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: orgA.id,
        carbonInventoryId: ciA.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // A BLOCKED (non-ACTIVE) org the caller is an ACTIVE CONTRIBUTOR of —
      // the membership lookup must also require the destination org to be
      // ACTIVE.
      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestMembership(prisma, testUserId, blockedOrg.id, {
        role: OrganizationRole.CONTRIBUTOR,
        status: MembershipStatus.ACTIVE,
      });

      const payload = buildUpdateReductionProjectPayload(
        blockedOrg.id.toString(),
        ciA.id.toString(),
        subcategory.id.toString(),
        { name: "Re-parent into non-active org" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_ORGANIZATION_FORBIDDEN");

      const unchanged = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(unchanged?.organizationId).toBe(orgA.id);
    });
  });

  describe("Authorization errors", () => {
    it("should return 403 when the reduction project does not exist", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "PATCH",
        url: "/api/reduction-projects/999999999",
        payload,
      });

      // The route's `reductionProject` auth hook resolves the project from
      // `:id` and 403s (not 404) before the service is ever reached.
      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when user has VIEWER role", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(
          prisma,
          testUserId,
          OrganizationRole.VIEWER
        );

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const payload = buildUpdateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
