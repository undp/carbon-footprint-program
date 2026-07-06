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
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { createCarbonInventory } from "@test/factories/carbonInventorySeeder.js";
import {
  setupReductionProjectPrerequisites,
  buildCreateReductionProjectPayload,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import type { CreateReductionProjectResponse } from "@repo/types";
import { InventoryStatus } from "@repo/types";
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

  describe("Successful creation", () => {
    it("should create a DRAFT with deferred fields left blank (partial draft) and return 201 with ID", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
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
      // Deferred business fields are null on a bare draft insert.
      expect(project?.implementationDate).toBeNull();
      expect(project?.description).toBeNull();
      expect(project?.subcategoryId).toBeNull();
      expect(project?.year).toBeNull();
      expect(project?.baselineScenario).toBeNull();
      expect(project?.projectScenario).toBeNull();
      expect(project?.consideredGei).toEqual([]);
    });

    it("should persist all fields on a complete first save (one request, no data lost)", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        {
          implementationDate: "2024-03-10",
          description: "Complete on first try",
          subcategoryId: subcategory.id.toString(),
          consideredGei: ["CO2"],
          year: 2024,
          baselineScenario: 1000,
          projectScenario: 800,
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
      expect(project?.implementationDate).toBe("2024-03-10");
      expect(project?.description).toBe("Complete on first try");
      expect(project?.subcategoryId).toBe(subcategory.id);
      expect(project?.year).toBe(2024);
      expect(Number(project?.baselineScenario)).toBe(1000);
      expect(Number(project?.projectScenario)).toBe(800);
      expect(project?.consideredGei).toEqual(["CO2"]);
    });

    it("should not create any REDUCTION_PROJECT_VERIFICATION submission on create", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateReductionProjectResponse;

      const submissionCount = await prisma.submission.count({
        where: {
          subject: {
            reductionProject: { reductionProjectId: BigInt(body.id) },
          },
        },
      });
      expect(submissionCount).toBe(0);

      // No submission subject at all yet — display status is DRAFT.
      const subject = await prisma.submissionSubjectReductionProject.findUnique(
        { where: { reductionProjectId: BigInt(body.id) } }
      );
      expect(subject).toBeNull();
    });

    it("should succeed even when the organization is not accredited (no prerequisite checks on create)", async () => {
      const organization = await createTestOrganization(prisma);
      await createTestMembership(prisma, testUserId, organization.id, {
        role: OrganizationRole.CONTRIBUTOR,
      });

      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createCarbonInventory(prisma, {
        organizationId: organization.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: 2024,
      });
      // Note: no organization accreditation submission, no CI verification.

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
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
      expect(project?.organizationId).toBe(organization.id);
      expect(project?.carbonInventoryId).toBe(carbonInventory.id);
    });

    it("should succeed even when the carbon inventory has no approved verification", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      // Remove the approved CI verification submission.
      await prisma.submission.deleteMany({
        where: {
          type: "CARBON_INVENTORY_VERIFICATION",
          subject: {
            carbonInventory: { carbonInventoryId: carbonInventory.id },
          },
        },
      });

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
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
    it("should return 400 when all required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when name is missing", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          organizationId: organization.id.toString(),
          carbonInventoryId: carbonInventory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when organizationId is missing", async () => {
      const { carbonInventory } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          name: "Test Reduction Project",
          carbonInventoryId: carbonInventory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when carbonInventoryId is missing", async () => {
      const { organization } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload: {
          name: "Test Reduction Project",
          organizationId: organization.id.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });

  describe("Authorization errors", () => {
    it("should return 403 when user has VIEWER role", async () => {
      const { organization, carbonInventory } =
        await setupReductionProjectPrerequisites(
          prisma,
          testUserId,
          OrganizationRole.VIEWER
        );

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
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

    it("should return 403 when user is not a member of the organization", async () => {
      const { organization, carbonInventory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const payload = buildCreateReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString()
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
  });

  describe("Cross-tenant guard", () => {
    it("should return 422 REDUCTION_PROJECT_INVALID_DATA when carbonInventoryId belongs to a different organization than organizationId", async () => {
      // Caller is a CONTRIBUTOR/ADMIN of both org A and org B.
      const { organization: orgA } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );
      const { carbonInventory: ciB } = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const payload = buildCreateReductionProjectPayload(
        orgA.id.toString(),
        ciB.id.toString()
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects",
        payload,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_INVALID_DATA");

      const projectCount = await prisma.reductionProject.count({
        where: { organizationId: orgA.id },
      });
      expect(projectCount).toBe(0);
    });
  });
});
