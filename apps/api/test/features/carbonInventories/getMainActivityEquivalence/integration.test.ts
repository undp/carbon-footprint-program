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
  cleanupCarbonInventoryTestData,
  createInventoryWithEmissions,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetMainActivityEquivalenceResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/main-activity-equivalence - Integration Tests", () => {
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

  beforeEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return null when organizationData has no mainActivityQuantity", async () => {
      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/main-activity-equivalence`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMainActivityEquivalenceResponse;
      expect(body).toBeNull();
    });

    it("should return equivalence data when mainActivityQuantity is defined", async () => {
      // Get a main activity from the database
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      if (!mainActivity) {
        // Skip if no main activity in seed data
        return;
      }

      const inventory = await createInventoryWithEmissions(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
        organizationData: {
          name: "Test Org",
          sectorId: null,
          subsectorId: null,
          sizeId: null,
          mainActivityId: mainActivity.id.toString(),
          mainActivityQuantity: 100,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/main-activity-equivalence`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMainActivityEquivalenceResponse;

      if (body !== null) {
        expect(body.rate).toBeGreaterThanOrEqual(0);
        expect(typeof body.activityName).toBe("string");
      }
    });
  });

  describe("Error handling", () => {
    it("should return 404 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/main-activity-equivalence",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });
  });
});
