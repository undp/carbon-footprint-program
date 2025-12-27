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
  getTestUsers,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersion } from "../../factories/methodologyFactory.js";

describe("GET /api/carbon-inventories/:id - Integration Tests", () => {
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
    it("should return a carbon inventory by valid ID", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.id).toBe(testInventory.id.toString());
      expect(body.year).toBeNull();
      expect(body.status).toBe("DRAFT");
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.isEditable).toBe(true);
    });

    it("should return complete data including all nullable fields when populated", async () => {
      // Get pre-seeded test users to satisfy foreign key constraints
      const [creatorUser, updaterUser] = await getTestUsers(prisma, [
        "creator@test.com",
        "updater@test.com",
      ]);

      const methodologyVersion = await getTestMethodologyVersion(prisma);

      const testInventory = await createInventoryFromPattern(prisma, () =>
        carbonInventoryPatterns.complete(
          BigInt(123),
          BigInt(456),
          BigInt(methodologyVersion.id),
          BigInt(111),
          creatorUser.id,
          updaterUser.id
        )
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      expect(body.id).toBe(testInventory.id.toString());
      expect(body.organizationId).toBe("123");
      expect(body.organizationBranchId).toBe("456");
      expect(body.organizationData).toEqual({
        name: "Test Organization",
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 250,
      });
      expect(body.year).toBe(2023);
      expect(body.status).toBe("VERIFIED");
      expect(body.usageMode).toBe("EXPERT");
      expect(body.methodologyVersionId).toBe(methodologyVersion.id.toString());
      expect(body.preselectedNodesId).toBe("111");
      expect(body.isEditable).toBe(false);
      expect(body.createdById).toBe(creatorUser.id.toString());
      expect(body.updatedById).toBe(updaterUser.id.toString());
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();
    });

    it("should return null for nullable fields when not populated", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
      expect(body.methodologyVersionId).toBeNull();
      expect(body.preselectedNodesId).toBeNull();
      expect(body.createdById).toBeNull();
      expect(body.updatedById).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (decimal)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/123.45",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (negative)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/-123",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Different inventory statuses", () => {
    it("should retrieve inventory with DRAFT status", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("DRAFT");
    });

    it("should retrieve inventory with SUBMITTED status", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.submitted
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("SUBMITTED");
    });

    it("should retrieve inventory with VERIFIED status", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.verified
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("VERIFIED");
    });

    it("should retrieve inventory with DELETED status", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.deleted
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("DELETED");
    });
  });

  describe("Different usage modes", () => {
    it("should retrieve inventory with SIMPLIFIED mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.usageMode).toBe("SIMPLIFIED");
    });

    it("should retrieve inventory with EXPERT mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.expertDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.usageMode).toBe("EXPERT");
    });
  });

  describe("Organization data validation", () => {
    it("should correctly return valid organization data", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.organizationData).toEqual({
        name: "Acme Corp",
        sectorId: "5",
        subsectorId: "12",
        sizeId: "3",
        mainActivityId: "8",
        mainActivityQuantity: 500,
      });
    });
  });

  describe("Year validation", () => {
    it("should retrieve inventory with valid year", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2022 }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.year).toBe(2022);
      expect(body.year).toBeGreaterThanOrEqual(2000);
      expect(body.year).toBeLessThanOrEqual(2100);
    });
  });

  describe("Editability", () => {
    it("should retrieve editable inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should retrieve non-editable inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.submitted
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.isEditable).toBe(false);
    });
  });
});
