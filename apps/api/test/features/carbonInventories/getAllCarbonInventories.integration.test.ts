import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  carbonInventoryPatterns,
  createInventoryFromPattern,
  createCarbonInventories,
  createTestUsers,
  cleanupTestData,
} from "@test/factories/carbonInventorySeeder.js";
import type { GetAllCarbonInventoriesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/carbon-inventories - Integration Tests", () => {
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
    await cleanupTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return an empty array when no carbon inventories exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it("should return carbon inventories when they exist", async () => {
      // Create test carbon inventories
      await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
    });
  });

  describe("Ordering", () => {
    it("should return inventories ordered by creation date (newest first)", async () => {
      // Create multiple inventories with different creation times
      const inventory1 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2022 }
      );

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const inventory2 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.expertDraft,
        { year: 2023 }
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const inventory3 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.submitted,
        { year: 2024 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(3);

      // Newest first (inventory3, inventory2, inventory1)
      expect(body[0].id).toBe(inventory3.id.toString());
      expect(body[1].id).toBe(inventory2.id.toString());
      expect(body[2].id).toBe(inventory1.id.toString());

      // Verify timestamps are in descending order
      expect(new Date(body[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(body[1].createdAt).getTime()
      );
      expect(new Date(body[1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(body[2].createdAt).getTime()
      );
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      // Create multiple inventories
      await createCarbonInventories(prisma, [
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2022 },
        { ...carbonInventoryPatterns.submitted(), year: 2023 },
        { ...carbonInventoryPatterns.verified(), year: 2024 },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      const ids = body.map((inv) => inv.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Response data mapping", () => {
    it("should correctly map all fields including nullable ones", async () => {
      // Create test users first to satisfy foreign key constraints
      const [creatorUser, updaterUser] = await createTestUsers(prisma, [
        "creator@test.com",
        "updater@test.com",
      ]);

      const testInventory = await createInventoryFromPattern(prisma, () => ({
        organization_id: BigInt(123),
        organization_branch_id: BigInt(456),
        organization_data: {
          name: "Test Org",
          sectorId: "1",
          subsectorId: "2",
          sizeId: "3",
          mainActivityId: "4",
          mainActivityQuantity: 100,
        },
        year: 2024,
        status: "DRAFT",
        usage_mode: "EXPERT",
        methodology_version_id: BigInt(789),
        preselected_nodes_id: BigInt(111),
        is_editable: true,
        created_by_id: creatorUser.id,
        updated_by_id: updaterUser.id,
      }));

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(1);

      const inventory = body[0];
      expect(inventory.id).toBe(testInventory.id.toString());
      expect(inventory.organizationId).toBe("123");
      expect(inventory.organizationBranchId).toBe("456");
      expect(inventory.organizationData).toEqual({
        name: "Test Org",
        sectorId: "1",
        subsectorId: "2",
        sizeId: "3",
        mainActivityId: "4",
        mainActivityQuantity: 100,
      });
      expect(inventory.year).toBe(2024);
      expect(inventory.status).toBe("DRAFT");
      expect(inventory.usageMode).toBe("EXPERT");
      expect(inventory.methodologyVersionId).toBe("789");
      expect(inventory.preselectedNodesId).toBe("111");
      expect(inventory.isEditable).toBe(true);
      expect(inventory.createdById).toBe(creatorUser.id.toString());
      expect(inventory.updatedById).toBe(updaterUser.id.toString());
      expect(inventory.createdAt).toBeTruthy();
      expect(inventory.updatedAt).toBeTruthy();
    });

    it("should correctly handle null values", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(1);

      const inventory = body[0];
      expect(inventory.id).toBe(testInventory.id.toString());
      expect(inventory.organizationId).toBeNull();
      expect(inventory.organizationBranchId).toBeNull();
      expect(inventory.organizationData).toBeNull();
      expect(inventory.methodologyVersionId).toBeNull();
      expect(inventory.preselectedNodesId).toBeNull();
      expect(inventory.createdById).toBeNull();
      expect(inventory.updatedById).toBeNull();
    });
  });

  describe("Different inventory statuses", () => {
    it("should return inventories with all different statuses", async () => {
      await createCarbonInventories(prisma, [
        carbonInventoryPatterns.simplifiedDraft(),
        carbonInventoryPatterns.submitted(),
        carbonInventoryPatterns.verified(),
        carbonInventoryPatterns.deleted(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(4);

      const statuses = body.map((inv) => inv.status);
      expect(statuses).toContain("DRAFT");
      expect(statuses).toContain("SUBMITTED");
      expect(statuses).toContain("VERIFIED");
      expect(statuses).toContain("DELETED");
    });
  });

  describe("Different usage modes", () => {
    it("should return inventories with different usage modes", async () => {
      await createCarbonInventories(prisma, [
        carbonInventoryPatterns.simplifiedDraft(),
        carbonInventoryPatterns.expertDraft(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(2);

      const usageModes = body.map((inv) => inv.usageMode);
      expect(usageModes).toContain("SIMPLIFIED");
      expect(usageModes).toContain("EXPERT");
    });
  });
});
