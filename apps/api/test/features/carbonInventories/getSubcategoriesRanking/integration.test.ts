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
import {
  cleanupCarbonInventoryTestData,
  createCarbonInventory,
  createInventoryWithEmissions,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetSubcategoriesRankingResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { Prisma, type PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/subcategories-ranking - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return ranking items sorted by descending emissions", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;

      expect(Array.isArray(body)).toBe(true);

      // Should be sorted by descending subtotal
      for (let i = 1; i < body.length; i++) {
        expect(body[i].subtotal).toBeLessThanOrEqual(body[i - 1].subtotal);
      }
    });

    it("should have valid ranking fields", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;

      for (const item of body) {
        expect(item.rank).toBeGreaterThanOrEqual(1);
        expect(typeof item.name).toBe("string");
        expect(typeof item.categoryName).toBe("string");
        expect(item.subtotal).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeGreaterThanOrEqual(0);
        expect(item.percentage).toBeLessThanOrEqual(1);
        expect(["HIGH", "MEDIUM", "LOW"]).toContain(item.severity);
      }
    });

    it("should return empty array for inventory with no emissions", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;

      expect(body).toEqual([]);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/subcategories-ranking",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Tie-breaking and severity thresholds", () => {
    const createLineWithEmissions = async (
      inventoryId: bigint,
      subcategoryId: bigint,
      emissionsKg: number
    ) => {
      const line = await createCarbonInventoryLine(
        prisma,
        inventoryId,
        subcategoryId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(emissionsKg),
      });
      await createCarbonInventoryLineResult(prisma, input.id, emissionsKg);
      return line;
    };

    it("breaks a subtotal tie by category position and assigns tied entries the same rank", async () => {
      const subcategories = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        select: {
          id: true,
          name: true,
          category: { select: { position: true } },
        },
        orderBy: { id: "asc" },
      });
      const subA = subcategories[0];
      const subB = subcategories.find(
        (s) => s.category.position !== subA.category.position
      );
      if (!subB) {
        throw new Error(
          "Expected subcategories spanning at least 2 categories"
        );
      }

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createLineWithEmissions(inventory.id, subA.id, 1000);
      await createLineWithEmissions(inventory.id, subB.id, 1000);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;
      expect(body).toHaveLength(2);

      const [lowerPositionSub, higherPositionSub] =
        subA.category.position < subB.category.position
          ? [subA, subB]
          : [subB, subA];
      expect(body[0].name).toBe(lowerPositionSub.name);
      expect(body[1].name).toBe(higherPositionSub.name);
      expect(body[0].rank).toBe(1);
      expect(body[1].rank).toBe(1);
    });

    it("breaks a subtotal and category-position tie by subcategory name", async () => {
      const categories = await prisma.category.findMany({
        where: { methodologyVersionId },
        select: { subcategories: { select: { id: true, name: true } } },
      });
      const categoryWithTwoSubs = categories.find(
        (c) => c.subcategories.length >= 2
      );
      if (!categoryWithTwoSubs) {
        throw new Error(
          "Expected a category with at least 2 subcategories in the test methodology"
        );
      }
      const [subA, subB] = categoryWithTwoSubs.subcategories;

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createLineWithEmissions(inventory.id, subA.id, 1000);
      await createLineWithEmissions(inventory.id, subB.id, 1000);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;
      expect(body).toHaveLength(2);

      const [firstByName, secondByName] =
        subA.name.localeCompare(subB.name) <= 0 ? [subA, subB] : [subB, subA];
      expect(body[0].name).toBe(firstByName.name);
      expect(body[1].name).toBe(secondByName.name);
      expect(body[0].rank).toBe(1);
      expect(body[1].rank).toBe(1);
    });

    it("assigns HIGH, MEDIUM, and LOW severities based on percentage thresholds", async () => {
      const subcategories = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        orderBy: { id: "asc" },
        take: 3,
      });
      const [subHigh, subMedium, subLow] = subcategories;

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      // Total = 1000 (ton-equivalent kg values below); percentages: 0.75, 0.20, 0.05
      await createLineWithEmissions(inventory.id, subHigh.id, 750000);
      await createLineWithEmissions(inventory.id, subMedium.id, 200000);
      await createLineWithEmissions(inventory.id, subLow.id, 50000);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/subcategories-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubcategoriesRankingResponse;
      const bySubName = new Map(body.map((item) => [item.name, item]));

      expect(bySubName.get(subHigh.name)?.severity).toBe("HIGH");
      expect(bySubName.get(subMedium.name)?.severity).toBe("MEDIUM");
      expect(bySubName.get(subLow.name)?.severity).toBe("LOW");
    });
  });
});
