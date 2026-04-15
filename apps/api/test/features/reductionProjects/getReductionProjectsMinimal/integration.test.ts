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
import type { GetReductionProjectsMinimalResponse } from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/reduction-projects/minimal - Integration Tests", () => {
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
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toEqual([]);
    });

    it("should return minimal data (id, name, organizationId, status, year)", async () => {
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
        { name: "Test Minimal Project", year: 2024 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: project.id.toString(),
        name: "Test Minimal Project",
        organizationId: organization.id.toString(),
        status: "DRAFT",
        year: 2024,
      });
    });

    it("should return projects user has access to (created by user or org member)", async () => {
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
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toHaveLength(1);
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
        url: "/api/reduction-projects/minimal?year=2023",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
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
        { name: "First" }
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const project2 = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { name: "Second" }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toHaveLength(2);
      expect(body[0].id).toBe(project2.id.toString());
      expect(body[1].id).toBe(project1.id.toString());
    });

    it("should return correct displayStatus based on submissions", async () => {
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
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe("APPROVED");
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
        url: "/api/reduction-projects/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectsMinimalResponse;
      expect(body).toHaveLength(0);
    });
  });
});
