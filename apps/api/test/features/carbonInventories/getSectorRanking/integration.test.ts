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
import type { GetSectorRankingResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/sector-ranking - Integration Tests", () => {
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
    it("should return sector ranking items sorted by descending emissions", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/sector-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSectorRankingResponse;

      expect(Array.isArray(body)).toBe(true);

      // Should be sorted by descending subtotal
      for (let i = 1; i < body.length; i++) {
        expect(body[i].subtotal).toBeLessThanOrEqual(body[i - 1].subtotal);
      }
    });

    it("should have valid ranking fields with severity levels", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/sector-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSectorRankingResponse;

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
        url: `/api/carbon-inventories/${inventory.id}/sector-ranking`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSectorRankingResponse;

      expect(body).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/sector-ranking",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
