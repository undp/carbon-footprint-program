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
import type { GetCarbonInventoryByIdResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";

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
    // Clean up carbon inventories and test users before each test
    await prisma.carbon_inventory.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: "@test.com",
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up carbon inventories and test users after each test
    await prisma.carbon_inventory.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: "@test.com",
        },
      },
    });
  });

  describe("Successful retrieval", () => {
    it("should return a carbon inventory by valid ID", async () => {
      const testInventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.id).toBe(testInventory.id.toString());
      expect(body.year).toBe(2024);
      expect(body.status).toBe("DRAFT");
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.isEditable).toBe(true);
    });

    it("should return complete data including all nullable fields when populated", async () => {
      // Create test users first to satisfy foreign key constraints
      const jobPosition = await prisma.country_job_position.findFirst();
      const creatorUser = await prisma.user.create({
        data: {
          email: "creator@test.com",
          country_job_position_id: jobPosition!.id,
        },
      });
      const updaterUser = await prisma.user.create({
        data: {
          email: "updater@test.com",
          country_job_position_id: jobPosition!.id,
        },
      });

      const testInventory = await prisma.carbon_inventory.create({
        data: {
          organization_id: BigInt(123),
          organization_branch_id: BigInt(456),
          organization_data: {
            name: "Test Organization",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
          year: 2023,
          status: "VERIFIED",
          usage_mode: "EXPERT",
          methodology_version_id: BigInt(789),
          preselected_nodes_id: BigInt(111),
          is_editable: false,
          created_by_id: creatorUser.id,
          updated_by_id: updaterUser.id,
        },
      });

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
      expect(body.methodologyVersionId).toBe("789");
      expect(body.preselectedNodesId).toBe("111");
      expect(body.isEditable).toBe(false);
      expect(body.createdById).toBe(creatorUser.id.toString());
      expect(body.updatedById).toBe(updaterUser.id.toString());
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();
    });

    it("should return null for nullable fields when not populated", async () => {
      const testInventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

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
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("DRAFT");
    });

    it("should retrieve inventory with SUBMITTED status", async () => {
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "SUBMITTED",
          usage_mode: "SIMPLIFIED",
          is_editable: false,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("SUBMITTED");
    });

    it("should retrieve inventory with VERIFIED status", async () => {
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "VERIFIED",
          usage_mode: "EXPERT",
          is_editable: false,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.status).toBe("VERIFIED");
    });

    it("should retrieve inventory with DELETED status", async () => {
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DELETED",
          usage_mode: "SIMPLIFIED",
          is_editable: false,
        },
      });

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
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.usageMode).toBe("SIMPLIFIED");
    });

    it("should retrieve inventory with EXPERT mode", async () => {
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "EXPERT",
          is_editable: true,
        },
      });

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
      const inventory = await prisma.carbon_inventory.create({
        data: {
          organization_data: {
            name: "Acme Corp",
            sectorId: "5",
            subsectorId: "12",
            sizeId: "3",
            mainActivityId: "8",
            mainActivityQuantity: 500,
          },
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

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
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2022,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

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
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "DRAFT",
          usage_mode: "SIMPLIFIED",
          is_editable: true,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should retrieve non-editable inventory", async () => {
      const inventory = await prisma.carbon_inventory.create({
        data: {
          year: 2024,
          status: "SUBMITTED",
          usage_mode: "SIMPLIFIED",
          is_editable: false,
        },
      });

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
