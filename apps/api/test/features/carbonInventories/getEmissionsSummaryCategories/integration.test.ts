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
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetEmissionsSummaryCategoriesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getEmissionsSummaryCategoriesService } from "@/features/carbonInventories/getEmissionsSummaryCategories/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("GET /api/carbon-inventories/:id/emissions-summary/categories - Integration Tests", () => {
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
    it("should return emissions summary with categories for an inventory with emissions", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary/categories`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsSummaryCategoriesResponse;

      expect(body.carbonInventory.id).toBe(inventory.id.toString());
      expect(body.totalEmissions).toBeGreaterThan(0);
      expect(Array.isArray(body.categories)).toBe(true);

      // Categories with emissions should have percentages summing to ~1
      const totalPercentage = body.categories.reduce(
        (sum, c) => sum + c.percentage,
        0
      );
      if (body.categories.length > 0) {
        expect(totalPercentage).toBeCloseTo(1, 2);
      }
    });

    it("should return categories ordered by position", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary/categories`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsSummaryCategoriesResponse;

      for (let i = 1; i < body.categories.length; i++) {
        expect(body.categories[i].position).toBeGreaterThanOrEqual(
          body.categories[i - 1].position
        );
      }
    });

    it("should return zero totalEmissions for inventory with no emissions data", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary/categories`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsSummaryCategoriesResponse;

      expect(body.totalEmissions).toBe(0);
      expect(Array.isArray(body.categories)).toBe(true);
      for (const category of body.categories) {
        expect(category.subtotal).toBe(0);
        expect(category.percentage).toBe(0);
      }
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/emissions-summary/categories",
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
        getEmissionsSummaryCategoriesService(prisma, "999999999")
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });
  });
});
