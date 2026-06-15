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
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import {
  setupReductionProjectPrerequisites,
  createTestReductionProject,
  createReductionProjectInDisplayStatus,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";
import { copyBlob } from "@/services/blobService.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn(),
  copyBlob: vi.fn().mockResolvedValue(undefined),
  deleteBlob: vi.fn().mockResolvedValue(undefined),
  moveBlob: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/reduction-projects/:id/request-verification - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
      storageConnectionString: inject("storageConnectionString"),
      storageContainerName: inject("storageContainerName"),
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
    vi.clearAllMocks();
  });

  const uploadSubmissionFile = async (uuid: string, name = "evidence.pdf") => {
    await uploadBlobToAzurite(
      app.blobStorage!,
      `SUBMISSION/tmp/${uuid}-${name}`,
      {
        contentType: "application/pdf",
      }
    );
    await app.inject({
      method: "POST",
      url: "/api/files/confirm-upload",
      payload: { uuid, originalName: name, fileType: "SUBMISSION" },
    });
  };

  describe("Successful submission", () => {
    it("should create a PENDING submission and link files from a DRAFT", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const uuid = "660e8400-e29b-41d4-a716-446655440001";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(200);

      const submission = await prisma.submission.findFirst({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });
      expect(submission).toBeDefined();
      expect(submission?.status).toBe(SubmissionStatus.PENDING);
      expect(submission?.createdById).toBe(testUserId);

      expect(vi.mocked(copyBlob)).toHaveBeenCalled();
      const fileRecord = await prisma.file.findUnique({
        where: { uuid },
        include: { submissionFiles: true },
      });
      expect(fileRecord?.submissionFiles).toHaveLength(1);
    });

    it("should create a new submission when resubmitting a REVIEWED project", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createReductionProjectInDisplayStatus(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        "REVIEWED"
      );

      const uuid = "660e8400-e29b-41d4-a716-446655440002";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(200);

      const submissions = await prisma.submission.findMany({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
        orderBy: { createdAt: "desc" },
      });

      // Original REVIEWED + the new PENDING.
      expect(submissions.length).toBeGreaterThanOrEqual(2);
      expect(submissions[0].status).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when no files are attached", async () => {
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
        payload: { fileUuids: [] },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });

  describe("Prerequisite errors", () => {
    it("should return 422 when the organization is not accredited", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.ORGANIZATION_ACCREDITATION,
          subject: {
            organizationData: {
              organizationData: { organizationId: organization.id },
            },
          },
        },
      });

      const uuid = "660e8400-e29b-41d4-a716-446655440003";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 when the carbon inventory lacks an approved verification", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
          subject: {
            carbonInventory: { carbonInventoryId: carbonInventory.id },
          },
        },
      });

      const uuid = "660e8400-e29b-41d4-a716-446655440004";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });
  });

  describe("Invalid state errors", () => {
    const NON_SUBMITTABLE = ["SUBMITTED", "APPROVED"] as const;

    it.each(NON_SUBMITTABLE)(
      "should return 422 when displayStatus is %s",
      async (displayStatus) => {
        const { organization, carbonInventory, subcategory } =
          await setupReductionProjectPrerequisites(prisma, testUserId);

        const project = await createReductionProjectInDisplayStatus(
          prisma,
          {
            organizationId: organization.id,
            carbonInventoryId: carbonInventory.id,
            subcategoryId: subcategory.id,
            createdById: testUserId,
          },
          displayStatus
        );

        const uuid = `660e8400-e29b-41d4-a716-${displayStatus === "SUBMITTED" ? "446655440005" : "446655440006"}`;
        await uploadSubmissionFile(uuid);

        const response = await app.inject({
          method: "POST",
          url: `/api/reduction-projects/${project.id}/request-verification`,
          payload: { fileUuids: [uuid] },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("REDUCTION_PROJECT_CANNOT_REQUEST_VERIFICATION");
      }
    );
  });

  describe("Authorization errors", () => {
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

      const uuid = "660e8400-e29b-41d4-a716-446655440007";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/request-verification`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 when the reduction project does not exist", async () => {
      const uuid = "660e8400-e29b-41d4-a716-446655440008";
      await uploadSubmissionFile(uuid);

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/999999999/request-verification",
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
