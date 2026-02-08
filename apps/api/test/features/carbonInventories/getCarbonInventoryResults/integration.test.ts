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
import {
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import type { GetCarbonInventoryResultsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { getTestOrganizationId } from "@test/factories/organizationFactory.js";

describe("GET /api/carbon-inventories/:id/results - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return emission results for an inventory with emissions", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const organizationId = await getTestOrganizationId(prisma);

      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
        organizationId,
        organizationData: {
          name: "Test Org",
          mainActivityId: null,
          mainActivityQuantity: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      expect(body.carbonInventory.id).toBe(inventory.id.toString());
      expect(body.totalEmissions).toBeGreaterThan(0);
      expect(body.categories.length).toBeGreaterThanOrEqual(3);
      expect(body.subcategoriesRanking.own.length).toBeGreaterThan(0);
      expect(body.subcategoriesRanking.sector.length).toBeGreaterThan(0);
      expect(body.suggestedReductionPlan.summary).toBeTruthy();
      expect(body.suggestedReductionPlan.items.length).toBeGreaterThan(0);
    });

    it("should include all methodology categories even with zero emissions", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Get the methodology to know how many categories exist
      const methodology = await prisma.methodologyVersion.findUnique({
        where: { id: methodologyVersionId },
        select: {
          categories: { select: { id: true, position: true } },
        },
      });

      // Create an inventory with emissions only in category position 1
      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 5000 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      // All methodology categories should be present
      expect(body.categories.length).toBe(methodology!.categories.length);

      // Categories without emissions should have subtotal 0
      const zeroCategories = body.categories.filter(
        (c) => c.position !== 1
      );
      for (const cat of zeroCategories) {
        expect(cat.subtotal).toBe(0);
        expect(cat.percentage).toBe(0);
      }

      // Category with emissions should have subtotal > 0
      const categoryWithEmissions = body.categories.find(
        (c) => c.position === 1
      );
      expect(categoryWithEmissions).toBeDefined();
      expect(categoryWithEmissions!.subtotal).toBe(5000);
      expect(categoryWithEmissions!.percentage).toBe(1);
    });

    it("should return categories with synonyms and position fields", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      for (const category of body.categories) {
        expect(category).toHaveProperty("synonyms");
        expect(category).toHaveProperty("position");
        expect(typeof category.position).toBe("number");
        expect(category.position).toBeGreaterThanOrEqual(1);
      }

      // Categories should be ordered by position
      for (let i = 1; i < body.categories.length; i++) {
        expect(body.categories[i].position).toBeGreaterThan(
          body.categories[i - 1].position
        );
      }
    });

    it("should calculate category percentages that sum to 1", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 3333 },
            { categoryPosition: 2, emissions: 3333 },
            { categoryPosition: 3, emissions: 3334 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      // Category percentages should sum to 1
      const categoriesWithEmissions = body.categories.filter(
        (c) => c.subtotal > 0
      );
      const totalPercentage = body.categories.reduce(
        (sum, c) => sum + c.percentage,
        0
      );
      expect(totalPercentage).toBeCloseTo(1, 4);

      // Each percentage should be between 0 and 1
      for (const cat of body.categories) {
        expect(cat.percentage).toBeGreaterThanOrEqual(0);
        expect(cat.percentage).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate subcategory percentages within each category that sum to 1", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 5000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      // For categories with emissions, subcategory percentages should sum to 1
      for (const category of body.categories) {
        if (category.subtotal > 0) {
          const subPercentageSum = category.subcategories.reduce(
            (sum, s) => sum + s.percentage,
            0
          );
          expect(subPercentageSum).toBeCloseTo(1, 4);
        }
      }
    });
  });

  describe("Rankings", () => {
    it("should return rankings sorted by descending subtotal", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 1000 },
            { categoryPosition: 2, emissions: 5000 },
            { categoryPosition: 3, emissions: 3000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      const rankings = body.subcategoriesRanking.own;

      // Rankings should be sorted by descending subtotal
      for (let i = 1; i < rankings.length; i++) {
        expect(rankings[i - 1].subtotal).toBeGreaterThanOrEqual(
          rankings[i].subtotal
        );
      }

      // Positions should be sequential starting from 1
      rankings.forEach((item, idx) => {
        expect(item.position).toBe(idx + 1);
      });
    });

    it("should assign correct severity levels to ranking items", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 5000 },
            { categoryPosition: 2, emissions: 3000 },
            { categoryPosition: 3, emissions: 1000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      const rankings = body.subcategoriesRanking.own;

      // First item should be HIGH
      if (rankings.length >= 1) {
        expect(rankings[0].severity).toBe("HIGH");
      }

      // Items 2-4 should be MEDIUM
      for (let i = 1; i < Math.min(4, rankings.length); i++) {
        expect(rankings[i].severity).toBe("MEDIUM");
      }

      // Items 5+ should be LOW
      for (let i = 4; i < rankings.length; i++) {
        expect(rankings[i].severity).toBe("LOW");
      }
    });

    it("should include ranking percentages that sum to 1", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 2000 },
            { categoryPosition: 2, emissions: 3000 },
            { categoryPosition: 3, emissions: 5000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      const rankings = body.subcategoriesRanking.own;
      const totalRankingPercentage = rankings.reduce(
        (sum, r) => sum + r.percentage,
        0
      );

      // Ranking percentages (relative to total emissions) should sum to 1
      // (only subcategories with emissions contribute, but all methodology subcategories are included)
      expect(totalRankingPercentage).toBeCloseTo(1, 4);
    });
  });

  describe("Main activity equivalence", () => {
    it("should return null when mainActivityQuantity is not set", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
        organizationData: {
          name: "Test Org",
          mainActivityId: null,
          mainActivityQuantity: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      expect(body.mainActivityEquivalence).toBeNull();
    });

    it("should calculate mainActivityEquivalence when mainActivityQuantity is set", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Get an existing main activity from the seed data
      const mainActivity =
        await prisma.organizationMainActivity.findFirst({
          select: { id: true, name: true },
        });

      // Skip test if no main activity is seeded
      if (!mainActivity) {
        return;
      }

      const inventory = await createInventoryWithEmissions(
        prisma,
        {
          usageMode: "SIMPLIFIED",
          methodologyVersionId,
          organizationData: {
            name: "Test Org",
            mainActivityId: mainActivity.id.toString(),
            mainActivityQuantity: 100,
          },
        },
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 5000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      expect(body.mainActivityEquivalence).not.toBeNull();
      // rate = totalEmissions / mainActivityQuantity = 5000 / 100 = 50
      expect(body.mainActivityEquivalence!.rate).toBe(50);
      expect(body.mainActivityEquivalence!.activityName).toBe(
        mainActivity.name
      );
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/results",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 404 for inventory without methodology", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/invalid-id/results",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Zero emissions", () => {
    it("should handle an inventory with no emissions gracefully", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Create inventory with methodology but no emission lines
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/results`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryResultsResponse;

      expect(body.totalEmissions).toBe(0);
      expect(body.categories.length).toBeGreaterThanOrEqual(3);

      // All categories should have 0 subtotal and 0 percentage
      for (const cat of body.categories) {
        expect(cat.subtotal).toBe(0);
        expect(cat.percentage).toBe(0);
      }

      // Rankings should all have 0 subtotal
      for (const item of body.subcategoriesRanking.own) {
        expect(item.subtotal).toBe(0);
        expect(item.percentage).toBe(0);
      }
    });
  });
});
