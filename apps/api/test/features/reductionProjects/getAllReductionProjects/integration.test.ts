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
  createTestReductionProject,
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { createCarbonInventory } from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetAllReductionProjectsResponse } from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import { InventoryStatus, GwpSourceEnum } from "@repo/types";
import {
  OrganizationRole,
  MembershipStatus,
  OrganizationStatus,
} from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/reduction-projects - Integration Tests", () => {
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

  describe("Successful retrieval", () => {
    it("should return empty array when no reduction projects exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toEqual([]);
    });

    it("should return reduction projects user has access to", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(project.id.toString());
      expect(body[0].name).toBe(project.name);
    });

    it("should filter by organizationId query parameter", async () => {
      const prereqs1 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );
      const prereqs2 = await setupReductionProjectPrerequisites(
        prisma,
        testUserId
      );

      const project1 = await createTestReductionProject(prisma, {
        organizationId: prereqs1.organization.id,
        carbonInventoryId: prereqs1.carbonInventory.id,
        subcategoryId: prereqs1.subcategory.id,
        createdById: testUserId,
      });

      await createTestReductionProject(prisma, {
        organizationId: prereqs2.organization.id,
        carbonInventoryId: prereqs2.carbonInventory.id,
        subcategoryId: prereqs2.subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${prereqs1.organization.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(project1.id.toString());
    });

    it("should filter by year query parameter", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project2023 = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { year: 2023 }
      );

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { year: 2024 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects?year=2023",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(project2023.id.toString());
      expect(body[0].year).toBe(2023);
    });

    it("should return projects sorted by createdAt desc", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project1 = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { name: "First Project" }
      );

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const project2 = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { name: "Second Project" }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(2);
      // Most recent first
      expect(body[0].id).toBe(project2.id.toString());
      expect(body[1].id).toBe(project1.id.toString());
    });

    it("should calculate totalReduction correctly", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        {
          baselineScenario: "1000.00",
          projectScenario: "600.00",
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].totalReduction).toBe(400); // 1000 - 600
    });

    it("should return a null totalReduction when baseline/project scenario are unset", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        {
          baselineScenario: null,
          projectScenario: null,
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].baselineScenario).toBeNull();
      expect(body[0].projectScenario).toBeNull();
      expect(body[0].totalReduction).toBeNull();
    });

    it("should return null subcategoryId and gwpUsed when unset", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        {
          subcategoryId: null,
          gwpUsed: null,
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].subcategoryId).toBeNull();
      expect(body[0].gwpUsed).toBeNull();
    });

    it("should return non-null gwpUsed when set", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { gwpUsed: GwpSourceEnum.IPCC_AR6 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].gwpUsed).toBe(GwpSourceEnum.IPCC_AR6);
    });

    it("should return null organizationName/organizationDisplayStatus when the org has no summary", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createCarbonInventory(prisma, {
        organizationId: org.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: 2024,
      });
      await createTestMembership(prisma, testUserId, org.id, {
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });
      const subcategory = await prisma.subcategory.findFirstOrThrow({
        select: { id: true },
      });

      await createTestReductionProject(prisma, {
        organizationId: org.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].organizationName).toBeNull();
      expect(body[0].organizationDisplayStatus).toBeNull();
    });
  });

  describe("Display status derivation", () => {
    it("should return DRAFT when no verification submission exists", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("DRAFT");
    });

    it("should return SUBMITTED when PENDING verification submission exists", async () => {
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
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("SUBMITTED");
    });

    it("should return REVIEWED when REVIEWED verification submission exists", async () => {
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
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("REVIEWED");
    });

    it("should return APPROVED when APPROVED verification submission exists", async () => {
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
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("APPROVED");
    });

    it("should return REJECTED when REJECTED verification submission exists", async () => {
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

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("REJECTED");
    });
  });

  describe("Access control", () => {
    it("should NOT return DELETED reduction projects", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { status: "DELETED" }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(0);
    });
  });
});
