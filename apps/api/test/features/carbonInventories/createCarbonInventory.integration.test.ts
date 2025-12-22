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
import { cleanupTestData } from "@test/factories/carbonInventorySeeder.js";
import type { CreateCarbonInventoryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { ValidationErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/carbon-inventories - Integration Tests", () => {
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

  describe("Successful creation", () => {
    it("should create carbon inventory with only required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.status).toBe("DRAFT"); // Default value
      expect(body.isEditable).toBe(true); // Default value
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();

      // Verify it was actually created in the database
      const dbInventory = await prisma.carbon_inventory.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbInventory).toBeDefined();
      expect(dbInventory?.year).toBe(2024);
    });

    it("should create carbon inventory with all fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          organizationId: "123",
          organizationBranchId: "456",
          organizationData: {
            name: "Test Organization",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
          year: 2023,
          usageMode: "EXPERT",
          methodologyVersionId: "789",
          preselectedNodesId: "111",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
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
      expect(body.usageMode).toBe("EXPERT");
      expect(body.methodologyVersionId).toBe("789");
      expect(body.preselectedNodesId).toBe("111");
      expect(body.status).toBe("DRAFT");
      expect(body.isEditable).toBe(true);
    });

    it("should create carbon inventory with SIMPLIFIED usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.usageMode).toBe("SIMPLIFIED");
    });

    it("should create carbon inventory with EXPERT usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "EXPERT",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.usageMode).toBe("EXPERT");
    });

    it("should create carbon inventory with partial organization data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: "Partial Org",
            sectorId: null,
            subsectorId: null,
            sizeId: "3",
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationData?.name).toBe("Partial Org");
      expect(body.organizationData?.sectorId).toBeNull();
    });
  });

  describe("Default values", () => {
    it("should set status to DRAFT by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.status).toBe("DRAFT");
    });

    it("should set isEditable to true by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should set nullable fields to null by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
      expect(body.methodologyVersionId).toBeNull();
      expect(body.preselectedNodesId).toBeNull();
      expect(body.createdById).toBeNull();
      expect(body.updatedById).toBeNull();
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when year is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when usageMode is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when year is below minimum (2000)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 1999,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when year is above maximum (2100)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2101,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when year is not an integer", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024.5,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when usageMode is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "INVALID",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when organizationId is not numeric string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationId: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationBranchId is not numeric string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationBranchId: "not-a-number",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when methodologyVersionId is not numeric string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          methodologyVersionId: "abc",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when preselectedNodesId is not numeric string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          preselectedNodesId: "xyz",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 with empty payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when organizationData has invalid structure", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: "Test",
            sectorId: "invalid", // Should be numeric string
            subsectorId: "10",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationData.mainActivityQuantity is not an integer", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: "Test",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250.5, // Should be integer
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when extra fields are provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          extraField: "should not be here",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Year boundary tests", () => {
    it("should accept year 2000 (minimum boundary)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2000,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.year).toBe(2000);
    });

    it("should accept year 2100 (maximum boundary)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2100,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.year).toBe(2100);
    });
  });

  describe("Organization data validation", () => {
    it("should accept complete valid organization data", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: "Complete Organization",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 1000,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationData).toEqual({
        name: "Complete Organization",
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 1000,
      });
    });

    it("should accept organization data with all null values", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: null,
            sectorId: null,
            subsectorId: null,
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationData?.name).toBeNull();
      expect(body.organizationData?.sectorId).toBeNull();
    });
  });

  describe("Multiple creations", () => {
    it("should create multiple inventories with unique IDs", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2022,
          usageMode: "SIMPLIFIED",
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2023,
          usageMode: "EXPERT",
        },
      });

      const response3 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
      expect(response3.statusCode).toBe(201);

      const body1 = JSON.parse(response1.body) as CreateCarbonInventoryResponse;
      const body2 = JSON.parse(response2.body) as CreateCarbonInventoryResponse;
      const body3 = JSON.parse(response3.body) as CreateCarbonInventoryResponse;

      expect(body1.id).not.toBe(body2.id);
      expect(body2.id).not.toBe(body3.id);
      expect(body1.id).not.toBe(body3.id);
    });

    it("should allow creating multiple inventories for the same year", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "EXPERT",
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);

      const body1 = JSON.parse(response1.body) as CreateCarbonInventoryResponse;
      const body2 = JSON.parse(response2.body) as CreateCarbonInventoryResponse;

      expect(body1.year).toBe(2024);
      expect(body2.year).toBe(2024);
      expect(body1.id).not.toBe(body2.id);
    });
  });

  describe("Timestamps", () => {
    it("should set createdAt and updatedAt timestamps", async () => {
      const beforeCreation = new Date();

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          year: 2024,
          usageMode: "SIMPLIFIED",
        },
      });

      const afterCreation = new Date();

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      const createdAt = new Date(body.createdAt);
      const updatedAt = new Date(body.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });
});
