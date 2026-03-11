import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import {
  createTestSubcategory,
  createTestSubcategoryUnits,
  getTestMeasurementUnitIds,
} from "@test/factories/subcategoryFactory.js";
import type { GetAllSubcategoriesResponse } from "@repo/types";
import { SubcategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("GET /api/subcategories/?methodologyVersionId=X - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful retrieval", () => {
    it("should return subcategories ordered by category position first, then by name", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategories Ordered",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const categoryB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category B",
        position: 2,
      });
      const categoryA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category A",
        position: 1,
      });

      await createTestSubcategory(prisma, categoryB.id, {
        name: "Test - Subcategory X",
      });
      await createTestSubcategory(prisma, categoryA.id, {
        name: "Test - Subcategory C",
      });
      await createTestSubcategory(prisma, categoryA.id, {
        name: "Test - Subcategory A",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;

      expect(body).toHaveLength(3);
      // Category A (position 1) subcategories first, sorted by name
      expect(body[0].name).toBe("Test - Subcategory A");
      expect(body[1].name).toBe("Test - Subcategory C");
      // Category B (position 2) subcategories last
      expect(body[2].name).toBe("Test - Subcategory X");
    });

    it("should include measurement unit IDs in the response", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategories With Units",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Parent Category Units",
        position: 1,
      });

      const subcategory = await createTestSubcategory(prisma, category.id, {
        name: "Test - Subcategory With Units",
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 2);
      await createTestSubcategoryUnits(prisma, subcategory.id, unitIds);

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;

      expect(body).toHaveLength(1);
      expect(body[0].measurementUnits).toHaveLength(2);
    });

    it("should not return deleted subcategories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategories With Deleted",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Parent Category Deleted",
        position: 1,
      });

      await createTestSubcategory(prisma, category.id, {
        name: "Test - Active Subcategory",
        status: SubcategoryStatus.ACTIVE,
      });
      await createTestSubcategory(prisma, category.id, {
        name: "Test - Deleted Subcategory",
        status: SubcategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;

      expect(body).toHaveLength(1);
      expect(body[0].name).toBe("Test - Active Subcategory");
    });

    it("should return empty array when methodology has no subcategories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Empty Methodology Subcats",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;

      expect(body).toEqual([]);
    });

    it("should return subcategories from multiple categories of the same methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Multi Category Subcats",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category1 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category 1",
        position: 1,
      });
      const category2 = await createTestCategory(prisma, methodology.id, {
        name: "Test - Category 2",
        position: 2,
      });

      await createTestSubcategory(prisma, category1.id, {
        name: "Test - Sub from Cat 1",
      });
      await createTestSubcategory(prisma, category2.id, {
        name: "Test - Sub from Cat 2",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;

      expect(body).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("should return 400 when methodologyVersionId is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/subcategories/",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
