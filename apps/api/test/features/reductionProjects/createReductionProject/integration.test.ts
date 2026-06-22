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
import { uploadFixture } from "@test/factories/storageHelper.js";
import {
  setupReductionProjectPrerequisites,
  buildReductionProjectPayload,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import type { CreateReductionProjectResponse } from "@repo/types";
import { GwpSourceEnum, ConsideredGeiEnum } from "@repo/types";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects - Integration Tests", () => {
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
    vi.clearAllMocks();
  });

  describe("Successful creation", () => {
    it("should create reduction project with valid data and return 201 with ID", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440001";
      const originalName = "evidence.pdf";
      const tmpBlobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;

      await uploadFixture(app.storage, tmpBlobPath, {
        contentType: "application/pdf",
      });

      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;
      expect(body.id).toBeTruthy();

      // Verify database record
      const project = await prisma.reductionProject.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(project).toBeDefined();
      expect(project?.name).toBe(payload.name);
      expect(project?.organizationId).toBe(organization.id);
      expect(project?.carbonInventoryId).toBe(carbonInventory.id);
    });

    it("should create submission subject and PENDING submission", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440002";
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

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;

      // Verify submission was created
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            reductionProject: {
              reductionProjectId: BigInt(body.id),
            },
          },
        },
      });

      expect(submission).toBeDefined();
      expect(submission?.status).toBe(SubmissionStatus.PENDING);
      expect(submission?.type).toBe(
        SubmissionType.REDUCTION_PROJECT_VERIFICATION
      );
      expect(submission?.createdById).toBe(testUserId);
    });

    it("should link files to submission via submissionFile records", async () => {
      const copySpy = vi.spyOn(app.storage, "copyObject");

      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440003";
      const originalName = "evidence.pdf";
      const tmpBlobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;

      await uploadFixture(app.storage, tmpBlobPath, {
        contentType: "application/pdf",
      });
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);

      // Verify the storage adapter's copy was invoked
      expect(copySpy).toHaveBeenCalled();

      // Verify file record was linked
      const fileRecord = await prisma.file.findUnique({
        where: { uuid },
        include: { submissionFiles: true },
      });
      expect(fileRecord?.submissionFiles).toHaveLength(1);
    });

    it("should accept all optional fields", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440004";
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

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [uuid],
        {
          gwpUsed: GwpSourceEnum.IPCC_AR5,
          reportedElsewhere: true,
          reportedElsewhereDescription: "Reported in external registry",
          year: 2023,
          consideredGei: [ConsideredGeiEnum.CO2, ConsideredGeiEnum.CH4],
        }
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;

      const project = await prisma.reductionProject.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(project?.gwpUsed).toBe(GwpSourceEnum.IPCC_AR5);
      expect(project?.reportedElsewhere).toBe(true);
      expect(project?.reportedElsewhereDescription).toBe(
        "Reported in external registry"
      );
      expect(project?.year).toBe(2023);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when fileUuids is empty array", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        [] // Empty array
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toContain("fileUuids");
    });

    it("should return 400 when baselineScenario is invalid", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440005";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
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
          baselineScenario: "not-a-number" as unknown as number,
        }
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name is missing", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const uuid = "550e8400-e29b-41d4-a716-446655440006";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      const payload = {
        organizationId: organization.id.toString(),
        carbonInventoryId: carbonInventory.id.toString(),
        subcategoryId: subcategory.id.toString(),
        fileUuids: [uuid],
        implementationDate: "2024-01-15",
        description: "Test",
        consideredGei: ["CO2"],
        reportedElsewhere: false,
        baselineScenario: 1000,
        projectScenario: 800,
        // name is missing
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
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

      const uuid = "550e8400-e29b-41d4-a716-446655440007";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
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
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when user is not member of organization", async () => {
      // Create prerequisites but don't create membership for current user
      const { organization, carbonInventory, subcategory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Delete the membership to simulate user not being a member
      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const uuid = "550e8400-e29b-41d4-a716-446655440008";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
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
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Business logic errors", () => {
    it("should return 422 when carbon inventory lacks approved verification", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Delete the approved submission to simulate missing verification
      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
          subject: {
            carbonInventory: {
              carbonInventoryId: carbonInventory.id,
            },
          },
        },
      });

      const uuid = "550e8400-e29b-41d4-a716-446655440009";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
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
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 when organization is not accredited", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Delete the organization's accreditation submission
      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.ORGANIZATION_ACCREDITATION,
          subject: {
            organizationData: {
              organizationData: {
                organizationId: organization.id,
              },
            },
          },
        },
      });

      const uuid = "550e8400-e29b-41d4-a716-446655440010";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
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
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });

    it("should return 422 when carbon inventory does not belong to organization", async () => {
      const prereqs1 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );
      const prereqs2 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const uuid = "550e8400-e29b-41d4-a716-446655440011";
      await uploadFixture(app.storage, `SUBMISSION/tmp/${uuid}-test.pdf`, {
        contentType: "application/pdf",
      });
      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName: "test.pdf", fileType: "SUBMISSION" },
      });

      // Use org1's organizationId but org2's carbonInventoryId
      const payload = buildReductionProjectPayload(
        prereqs1.organization.id.toString(),
        prereqs2.carbonInventory.id.toString(), // Mismatched
        prereqs1.subcategory.id.toString(),
        [uuid]
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");
    });
  });

  describe("Multiple file attachments", () => {
    it("should link multiple files to the submission", async () => {
      const copySpy = vi.spyOn(app.storage, "copyObject");
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const files = [
        { uuid: "550e8400-e29b-41d4-a716-446655440012", name: "doc1.pdf" },
        { uuid: "550e8400-e29b-41d4-a716-446655440013", name: "doc2.pdf" },
        { uuid: "550e8400-e29b-41d4-a716-446655440014", name: "doc3.pdf" },
      ];

      for (const f of files) {
        await uploadFixture(app.storage, `SUBMISSION/tmp/${f.uuid}-${f.name}`, {
          contentType: "application/pdf",
        });
        await app.inject({
          method: "POST",
          url: "/api/files/confirm-upload",
          payload: {
            uuid: f.uuid,
            originalName: f.name,
            fileType: "SUBMISSION",
          },
        });
      }

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        files.map((f) => f.uuid)
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      expect(copySpy).toHaveBeenCalledTimes(files.length);

      for (const f of files) {
        const fileRecord = await prisma.file.findUnique({
          where: { uuid: f.uuid },
          include: { submissionFiles: true },
        });
        expect(fileRecord?.submissionFiles).toHaveLength(1);
      }
    });
  });
});
