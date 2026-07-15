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
  createCarbonInventoryLine,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetReductionPlanResponse } from "@repo/types";
import { CarbonInventoryLineStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getReductionPlanService } from "@/features/carbonInventories/getReductionPlan/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("GET /api/carbon-inventories/:id/reduction-plan - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;
  let subcategoryIds: bigint[];

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
    subcategoryIds = await getSubcategoryIds(prisma, methodologyVersionId);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return categories with subcategories and initiatives for a valid inventory", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[0]);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionPlanResponse;

      expect(Array.isArray(body.categories)).toBe(true);
      expect(body.categories.length).toBeGreaterThan(0);

      const category = body.categories[0];
      expect(typeof category.id).toBe("string");
      expect(typeof category.name).toBe("string");
      expect(typeof category.synonyms).toBe("string");
      expect(typeof category.position).toBe("number");
      expect(typeof category.icon).toBe("string");
      expect(typeof category.color).toBe("string");
      expect(typeof category.description).toBe("string");
      expect(
        category.explanation === null ||
          typeof category.explanation === "string"
      ).toBe(true);

      expect(Array.isArray(category.subcategories)).toBe(true);
      expect(category.subcategories.length).toBeGreaterThan(0);

      const subcategory = category.subcategories[0];
      expect(typeof subcategory.id).toBe("string");
      expect(typeof subcategory.name).toBe("string");
      expect(typeof subcategory.icon).toBe("string");
      expect(typeof subcategory.description).toBe("string");

      expect(Array.isArray(subcategory.initiatives)).toBe(true);
      expect(subcategory.initiatives.length).toBeGreaterThan(0);

      const initiative = subcategory.initiatives[0];
      expect(typeof initiative.id).toBe("string");
      expect(typeof initiative.title).toBe("string");
      expect(typeof initiative.description).toBe("string");
    });
  });

  describe("Empty response cases", () => {
    it("should return empty categories when inventory has no lines", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionPlanResponse;
      expect(body.categories).toEqual([]);
    });

    it("should return empty categories when all lines are not ACTIVE", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[0], {
        status: CarbonInventoryLineStatus.OUTDATED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionPlanResponse;
      expect(body.categories).toEqual([]);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/reduction-plan",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        getReductionPlanService(prisma, "999999999")
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });
  });
});
