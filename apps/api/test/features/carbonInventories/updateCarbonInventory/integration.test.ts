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
  seedCarbonInventory,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  type UpdateCarbonInventoryResponse,
  InventoryStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ValidationErrorResponse,
} from "@/commonSchemas/errors.js";

describe("PATCH /api/carbon-inventories/:id - Integration Tests", () => {
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

  describe("Successful updates", () => {
    it("should update a single field (year)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.id).toBe(inventory.id.toString());
      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("SIMPLIFIED"); // Unchanged

      // Verify in database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.year).toBe(2024);
    });

    it("should update usageMode", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          usageMode: "EXPERT",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.usageMode).toBe("EXPERT");
      expect(body.year).toBeNull(); // Unchanged
    });

    it("should update status", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          status: "SUBMITTED",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.status).toBe("SUBMITTED");
    });

    it("should update isEditable", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          isEditable: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.isEditable).toBe(false);
    });

    it("should update organizationId", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationId: "123",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationId).toBe("123");
    });

    it("should update name", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          name: "Updated Inventory Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.name).toBe("Updated Inventory Name");

      // Verify in database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.name).toBe("Updated Inventory Name");
    });

    it("should update organizationBranchId", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationBranchId: "456",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationBranchId).toBe("456");
    });

    it("should update organizationData", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const organizationData = {
        name: "Updated Organization",
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 500,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationData,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationData).toEqual(organizationData);
    });

    it("should update preselectedNodesId", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          preselectedNodesId: "111",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.preselectedNodesId).toBe("111");
    });

    it("should update multiple fields at once", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          usageMode: "EXPERT",
          status: "SUBMITTED",
          organizationId: "123",
          organizationBranchId: "456",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.status).toBe("SUBMITTED");
      expect(body.organizationId).toBe("123");
      expect(body.organizationBranchId).toBe("456");
    });

    it("should update with empty payload (no changes)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.id).toBe(inventory.id.toString());
      expect(body.year).toBeNull();
      expect(body.usageMode).toBe("SIMPLIFIED");
    });

    it("should set nullable fields to null", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        organizationId: 123,
        organizationBranchId: 456,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: null,
          organizationId: null,
          organizationBranchId: null,
          organizationData: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
    });

    it("should update all status values", async () => {
      const statuses: InventoryStatus[] = [
        InventoryStatus.DRAFT,
        InventoryStatus.SUBMITTED,
        InventoryStatus.VERIFIED,
        InventoryStatus.DELETED,
      ];

      for (const status of statuses) {
        const inventory = await seedCarbonInventory(prisma, {
          usageMode: "SIMPLIFIED",
        });

        const response = await app.inject({
          method: "PATCH",
          url: `/api/carbon-inventories/${inventory.id}`,
          payload: { status },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
        expect(body.status).toBe(status);
      }
    });
  });

  describe("Not found errors", () => {
    it("should return 404 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/999999",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 (validation error) for non-numeric id", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/invalid",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(400); // Validation error
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when year is below minimum (2000)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 1999,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when year is above maximum (2100)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2101,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when year is not an integer", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024.5,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when usageMode is invalid", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          usageMode: "INVALID",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when status is invalid", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          status: "INVALID_STATUS",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationId: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationBranchId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationBranchId: "not-a-number",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when methodologyVersionId is provided (field is not allowed)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const methodologyVersionIdString = methodologyVersionId.toString();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          methodologyVersionId: methodologyVersionIdString,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when preselectedNodesId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          preselectedNodesId: "xyz",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationData has invalid structure", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationData: {
            name: "Test",
            sectorId: "invalid", // non-numeric string should fail numeric-id validation
            subsectorId: "10",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when extra fields are provided", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          extraField: "should not be here",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Year boundary tests", () => {
    it("should accept year 2000 (minimum boundary)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2000);
    });

    it("should accept year 2100 (maximum boundary)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2100,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2100);
    });
  });

  describe("Timestamps", () => {
    it("should update the updatedAt timestamp", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const originalUpdatedAt = inventory.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      const updatedAt = new Date(body.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());

      // createdAt should remain the same
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.createdAt.toISOString()).toBe(
        inventory.createdAt.toISOString()
      );
    });
  });
});
