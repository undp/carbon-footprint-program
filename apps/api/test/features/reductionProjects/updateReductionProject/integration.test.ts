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
  buildReductionProjectPayload,
  createTestReductionProject,
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import { GwpSourceEnum } from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn(),
  copyBlob: vi.fn().mockResolvedValue(undefined),
  deleteBlob: vi.fn().mockResolvedValue(undefined),
  moveBlob: vi.fn().mockResolvedValue(undefined),
}));

describe("PATCH /api/reduction-projects/:id - Integration Tests", () => {
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

  describe("Successful update", () => {
    it("should update reduction project when displayStatus is REVIEWED", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Set to REVIEWED status (editable)
      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.REVIEWED,
        testUserId
      );

      const uuid = "550e8400-e29b-41d4-a716-446655440100";
      const originalName = "updated-evidence.pdf";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-${originalName}`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid],
        { name: "Updated Project Name" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      // Verify the update
      const updatedProject = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updatedProject?.name).toBe("Updated Project Name");
    });

    it("should create new PENDING submission after update", async () => {
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

      const uuid = "550e8400-e29b-41d4-a716-446655440101";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      // Verify new submission was created
      const submissions = await prisma.submission.findMany({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: {
            reductionProject: {
              reductionProjectId: project.id,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Should have 2 submissions: the original REVIEWED and the new PENDING
      expect(submissions.length).toBeGreaterThanOrEqual(2);
      expect(submissions[0].status).toBe(SubmissionStatus.PENDING);
    });

    it("should update all mutable fields", async () => {
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

      const uuid = "550e8400-e29b-41d4-a716-446655440102";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid],
        {
          name: "New Name",
          description: "New description",
          implementationDate: "2025-06-15",
          gwpUsed: GwpSourceEnum.IPCC_AR6,
          consideredGei: ["CO2", "CH4"],
          reportedElsewhere: true,
          reportedElsewhereDescription: "External registry",
          year: 2025,
          baselineScenario: "2000.00",
          projectScenario: "1500.00",
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
      expect(updated?.reportedElsewhere).toBe(true);
      expect(updated?.year).toBe(2025);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when fileUuids is empty", async () => {
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

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [] // Empty
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when required fields are missing", async () => {
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
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "Just name" }, // Missing required fields
      });

      expect(response.statusCode).toBe(400);
    });
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

      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.REVIEWED,
        testUserId
      );

      const uuid = "550e8400-e29b-41d4-a716-446655440103";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 when user is not member of organization", async () => {
      const { organization, carbonInventory, subcategory, membership } =
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

      // Remove membership
      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const uuid = "550e8400-e29b-41d4-a716-446655440104";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Not found errors", () => {
    it("should return 404 when reduction project does not exist", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440105";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "PATCH",
        url: "/api/reduction-projects/999999999",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_FOUND");
    });
  });

  describe("Business logic errors", () => {
    it("should return 422 when displayStatus is DRAFT", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });
      // No submission = DRAFT status

      const uuid = "550e8400-e29b-41d4-a716-446655440106";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
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

    it("should return 422 when displayStatus is SUBMITTED", async () => {
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
        SubmissionStatus.PENDING, // PENDING = SUBMITTED display status
        testUserId
      );

      const uuid = "550e8400-e29b-41d4-a716-446655440107";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
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

    it("should return 422 when displayStatus is APPROVED", async () => {
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

      const uuid = "550e8400-e29b-41d4-a716-446655440108";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
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

    it("should return 422 when displayStatus is REJECTED", async () => {
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
        SubmissionStatus.REJECTED,
        testUserId
      );

      const uuid = "550e8400-e29b-41d4-a716-446655440109";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-test.pdf`,
        { contentType: "application/pdf" }
      );
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
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
});
