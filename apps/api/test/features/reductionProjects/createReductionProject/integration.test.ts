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
import {
  setupReductionProjectPrerequisites,
  buildReductionProjectPayload,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import type {
  CreateReductionProjectResponse,
  GetAllAdminRequestsResponse,
} from "@repo/types";
import { GwpSourceEnum, ConsideredGeiEnum } from "@repo/types";
import {
  InventoryStatus as PrismaInventoryStatus,
  SubmissionType,
} from "@repo/database";
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

  describe("Successful creation (DRAFT-first)", () => {
    it("should create a DRAFT reduction project and return 201 with ID", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;
      expect(body.id).toBeTruthy();

      const project = await prisma.reductionProject.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(project).toBeDefined();
      expect(project?.name).toBe(payload.name);
      expect(project?.organizationId).toBe(organization.id);
      expect(project?.carbonInventoryId).toBe(carbonInventory.id);
    });

    it("should NOT create any submission (the project is a DRAFT)", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;

      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            reductionProject: { reductionProjectId: BigInt(body.id) },
          },
        },
      });
      expect(submission).toBeNull();

      const subject = await prisma.submissionSubjectReductionProject.findUnique(
        {
          where: { reductionProjectId: BigInt(body.id) },
        }
      );
      expect(subject).toBeNull();
    });

    it("should accept all optional fields", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
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

    it("should succeed even when the organization is not yet accredited", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Remove the org's accreditation — create only does a light referential
      // check, so this must still succeed.
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

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
    });

    it("should succeed even when the carbon inventory has no approved verification", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Remove the CI's approved verification — not required at create time.
      await prisma.submission.deleteMany({
        where: {
          type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
          subject: {
            carbonInventory: { carbonInventoryId: carbonInventory.id },
          },
        },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
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

    it("should return 400 when baselineScenario is invalid", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        { baselineScenario: "not-a-number" as unknown as number }
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

      const payload = {
        organizationId: organization.id.toString(),
        carbonInventoryId: carbonInventory.id.toString(),
        subcategoryId: subcategory.id.toString(),
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

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
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
      const { organization, carbonInventory, subcategory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Referential check errors", () => {
    it("should return 422 when carbon inventory does not belong to organization", async () => {
      const prereqs1 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );
      const prereqs2 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const payload = buildReductionProjectPayload(
        prereqs1.organization.id.toString(),
        prereqs2.carbonInventory.id.toString(), // Mismatched
        prereqs1.subcategory.id.toString()
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

    it("should return 422 when carbon inventory is not ACTIVE", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await prisma.carbonInventory.update({
        where: { id: carbonInventory.id },
        data: { status: PrismaInventoryStatus.DELETED },
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString()
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

  describe("Admin requests queue regression", () => {
    it("should NOT appear in the admin requests queue while a DRAFT", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: buildReductionProjectPayload(
          organization.id.toString(),
          carbonInventory.id.toString(),
          subcategory.id.toString()
        ),
      });
      expect(createResponse.statusCode).toBe(201);
      const { id } = JSON.parse(
        createResponse.body
      ) as CreateReductionProjectResponse;

      const queueResponse = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });
      expect(queueResponse.statusCode).toBe(200);
      const queue = JSON.parse(
        queueResponse.body
      ) as GetAllAdminRequestsResponse;

      const draftEntry = queue.find((r) => r.reductionProjectId === id);
      expect(draftEntry).toBeUndefined();
    });
  });
});
