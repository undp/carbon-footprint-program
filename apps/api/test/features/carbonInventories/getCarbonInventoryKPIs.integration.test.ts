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
  createCarbonInventories,
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import type { GetCarbonInventoryKPIsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/carbon-inventories/kpis - Integration Tests", () => {
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

  describe("Empty state", () => {
    it("should return zero totals when no carbon inventories exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(0);
      expect(body.categoryTotals).toEqual([]);
    });

    it("should return zero totals when only DRAFT inventories exist", async () => {
      // DRAFT inventories should be excluded
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.simplifiedDraft()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(0);
      expect(body.categoryTotals).toEqual([]);
    });
  });

  describe("Status filtering", () => {
    it("should include VERIFIED inventories", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBeGreaterThan(0);
      expect(body.categoryTotals.length).toBeGreaterThan(0);
    });

    it("should include SUBMITTED inventories", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.submitted()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBeGreaterThan(0);
      expect(body.categoryTotals.length).toBeGreaterThan(0);
    });

    it("should exclude DRAFT inventories", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.simplifiedDraft()
      );
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      // Should only count emissions from the verified inventory
      expect(body.total).toBeGreaterThan(0);
      // Total should equal sum of verified inventory only (default 3 categories: 1000+2000+3000 = 6000)
      expect(body.total).toBe(6000);
    });

    it("should include multiple non-DRAFT statuses", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.submitted(),
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1000 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified(),
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 2000 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(3000); // 1000 + 2000
    });
  });

  describe("Year filtering", () => {
    it("should return all years when no year parameter is provided", async () => {
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2023 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1000 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2024 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 2000 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(3000); // Both years
    });

    it("should return all years when year=all", async () => {
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2023 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1000 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2024 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 2000 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis?year=all",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(3000); // Both years
    });

    it("should filter by specific year", async () => {
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2023 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1000 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2024 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 2000 }],
        }
      );

      const response2024 = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis?year=2024",
      });

      expect(response2024.statusCode).toBe(200);
      const body2024 = JSON.parse(
        response2024.body
      ) as GetCarbonInventoryKPIsResponse;
      expect(body2024.total).toBe(2000); // Only 2024

      const response2023 = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis?year=2023",
      });

      expect(response2023.statusCode).toBe(200);
      const body2023 = JSON.parse(
        response2023.body
      ) as GetCarbonInventoryKPIsResponse;
      expect(body2023.total).toBe(1000); // Only 2023
    });

    it("should return zero when no inventories match the year filter", async () => {
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2023 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis?year=2025",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(0);
      expect(body.categoryTotals).toEqual([]);
    });
  });

  describe("Response structure", () => {
    it("should return valid response schema with total and categoryTotals", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("categoryTotals");
      expect(typeof body.total).toBe("number");
      expect(Array.isArray(body.categoryTotals)).toBe(true);
    });

    it("should have categoryTotals with correct structure", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      expect(body.categoryTotals.length).toBeGreaterThan(0);
      const categoryTotal = body.categoryTotals[0];
      expect(categoryTotal).toHaveProperty("categoryPosition");
      expect(categoryTotal).toHaveProperty("categoryName");
      expect(categoryTotal).toHaveProperty("total");
      expect(typeof categoryTotal.categoryPosition).toBe("number");
      expect(typeof categoryTotal.categoryName).toBe("string");
      expect(typeof categoryTotal.total).toBe("number");
    });

    it("should return categoryTotals sorted by position", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      if (body.categoryTotals.length > 1) {
        for (let i = 1; i < body.categoryTotals.length; i++) {
          expect(body.categoryTotals[i].categoryPosition).toBeGreaterThanOrEqual(
            body.categoryTotals[i - 1].categoryPosition
          );
        }
      }
    });
  });

  describe("Aggregation calculations", () => {
    it("should aggregate emissions across multiple inventories", async () => {
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2023 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1500 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        { ...carbonInventoryPatterns.verified(), year: 2024 },
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 2500 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(4000); // 1500 + 2500
      expect(body.categoryTotals.length).toBeGreaterThan(0);
    });

    it("should sum category totals to equal the grand total", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified(),
        {
          emissionsByCategory: [
            { categoryPosition: 1, emissions: 1000 },
            { categoryPosition: 2, emissions: 2000 },
            { categoryPosition: 3, emissions: 3000 },
          ],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      const sumOfCategories = body.categoryTotals.reduce(
        (sum, cat) => sum + cat.total,
        0
      );

      expect(body.total).toBe(6000);
      expect(sumOfCategories).toBe(6000);
    });

    it("should return numeric totals, not Decimal objects", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      expect(typeof body.total).toBe("number");
      body.categoryTotals.forEach((cat) => {
        expect(typeof cat.total).toBe("number");
      });
    });

    it("should aggregate same category across multiple inventories", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified(),
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1000 }],
        }
      );
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.submitted(),
        {
          emissionsByCategory: [{ categoryPosition: 1, emissions: 1500 }],
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;

      expect(body.total).toBe(2500);
      expect(body.categoryTotals.length).toBe(1);
      expect(body.categoryTotals[0].total).toBe(2500); // 1000 + 1500
    });
  });

  describe("Edge cases", () => {
    it("should handle inventories with no emissions", async () => {
      // Create an inventory without any emissions data
      await createCarbonInventories(prisma, [
        carbonInventoryPatterns.verified(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBe(0);
      expect(body.categoryTotals).toEqual([]);
    });

    it("should handle invalid year parameter gracefully", async () => {
      await createInventoryWithEmissions(
        prisma,
        carbonInventoryPatterns.verified()
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/kpis?year=invalid",
      });

      // Should return all years when invalid year is provided
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryKPIsResponse;
      expect(body.total).toBeGreaterThan(0);
    });
  });
});
