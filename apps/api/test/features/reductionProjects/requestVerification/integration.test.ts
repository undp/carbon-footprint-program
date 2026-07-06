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
import { uploadFixture } from "@test/factories/storageHelper.js";
import {
  setupReductionProjectPrerequisites,
  createTestReductionProject,
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/request-verification - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
      storageDescriptor: inject("storageDescriptor"),
    });
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

  describe("Successful submission", () => {
    it("should submit a complete DRAFT (no fileUuids) and return 200 with a new PENDING submission", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(200);

      const submissions = await prisma.submission.findMany({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });
      expect(submissions).toHaveLength(1);
      expect(submissions[0].status).toBe(SubmissionStatus.PENDING);
    });

    it("should submit a complete DRAFT with fileUuids and link the files to the new submission", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const uuid = "550e8400-e29b-41d4-a716-446655440201";
      const originalName = "evidence.pdf";
      await uploadFixture(
        app.storage,
        `SUBMISSION/tmp/${uuid}-${originalName}`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(200);

      const fileRecord = await prisma.file.findUnique({
        where: { uuid },
        include: { submissionFiles: true },
      });
      expect(fileRecord?.submissionFiles).toHaveLength(1);
    });

    it("should re-submit a REVIEWED project, creating a new PENDING submission (display status -> SUBMITTED)", async () => {
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

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(200);

      const submissions = await prisma.submission.findMany({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
        orderBy: { id: "desc" },
      });
      // Original REVIEWED + new PENDING
      expect(submissions).toHaveLength(2);
      expect(submissions[0].status).toBe(SubmissionStatus.PENDING);
    });

    it("should submit a complete DRAFT that is reportedElsewhere with a non-null description", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        {
          reportedElsewhere: true,
          reportedElsewhereDescription: "Reported in the national GHG registry",
        }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(200);

      const submissions = await prisma.submission.findMany({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });
      expect(submissions).toHaveLength(1);
      expect(submissions[0].status).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Invalid state transitions", () => {
    it("should return 422 REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION when already SUBMITTED (PENDING submission)", async () => {
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

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION");
    });

    it("should return 422 REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION when already APPROVED", async () => {
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

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION");
    });
  });

  describe("Invalid prerequisites", () => {
    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when the organization is not accredited", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await prisma.submission.deleteMany({
        where: {
          type: "ORGANIZATION_ACCREDITATION",
          subject: {
            organizationData: {
              organizationData: { organizationId: organization.id },
            },
          },
        },
      });

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when the linked carbon inventory has no approved verification", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
          subject: {
            carbonInventory: { carbonInventoryId: carbonInventory.id },
          },
        },
      });

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when the draft is incomplete", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: null as unknown as bigint,
          createdById: testUserId,
        },
        {
          subcategoryId: null,
          year: null,
          baselineScenario: null,
          projectScenario: null,
          implementationDate: null,
          description: null,
          consideredGei: [],
        }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when gwpUsed is missing", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { gwpUsed: null }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");

      const submissionCount = await prisma.submission.count({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });
      expect(submissionCount).toBe(0);
    });

    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when reportedElsewhere is true but reportedElsewhereDescription is missing", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { reportedElsewhere: true, reportedElsewhereDescription: null }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");

      const submissionCount = await prisma.submission.count({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });
      expect(submissionCount).toBe(0);
    });
  });

  describe("Authorization errors", () => {
    it("should return 403 when the reduction project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/999999999/request-verification",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when the caller is not a member of the project's organization", async () => {
      const { organization, carbonInventory, subcategory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when the caller has only VIEWER role", async () => {
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

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
