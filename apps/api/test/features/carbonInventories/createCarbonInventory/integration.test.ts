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
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  type CreateCarbonInventoryResponse,
  MethodologyVersionStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";
import { getTestLoggedUser } from "../../../factories/userFactory.js";

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
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful creation", () => {
    it("should create carbon inventory with SIMPLIFIED usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.year).toBeNull(); // Defaults to null
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.status).toBe("DRAFT"); // Default value
      expect(body.isEditable).toBe(true); // Default value
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();

      // Verify it was actually created in the database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbInventory).toBeDefined();
      expect(dbInventory?.year).toBeNull();
    });

    it("should create carbon inventory with EXPERT usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "EXPERT",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.year).toBeNull();
      expect(body.usageMode).toBe("EXPERT");
      expect(body.status).toBe("DRAFT");
      expect(body.isEditable).toBe(true);
    });
  });

  describe("Default values", () => {
    it("should set status to DRAFT by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
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
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should set year to null by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.year).toBeNull();
    });

    it("should set nullable fields to null by default", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const methodologyVersionIdString = methodologyVersionId.toString();

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      const { id } = await getTestLoggedUser(prisma);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.name).toBeNull();
      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
      expect(body.methodologyVersionId).toBe(methodologyVersionIdString);
      expect(body.preselectedNodesId).toBeNull();
      expect(body.createdById).toBe(id.toString());
      expect(body.updatedById).toBe(id.toString());
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when usageMode is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("usageMode");
    });

    it("should return 400 when usageMode is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "INVALID",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when extra fields are provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationId is provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: "123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationData is provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationData: {
            name: "Test",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Multiple creations", () => {
    it("should create multiple inventories with unique IDs", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "EXPERT",
        },
      });

      const response3 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
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

    it("should allow creating multiple inventories with the same usageMode", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);

      const body1 = JSON.parse(response1.body) as CreateCarbonInventoryResponse;
      const body2 = JSON.parse(response2.body) as CreateCarbonInventoryResponse;

      expect(body1.usageMode).toBe("SIMPLIFIED");
      expect(body2.usageMode).toBe("SIMPLIFIED");
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

  describe("Business logic errors", () => {
    it("should return 422 when no active methodology is found", async () => {
      // Temporarily change all active methodologies to DELETED
      const activeMethodologies = await prisma.methodologyVersion.findMany({
        where: {
          status: MethodologyVersionStatus.ACTIVE,
        },
      });

      // Store original status IDs to restore later
      const originalStatusIds = activeMethodologies.map((m) => ({
        id: m.id,
        status: m.status,
      }));

      // Update all active methodologies to DELETED
      await prisma.methodologyVersion.updateMany({
        where: {
          status: MethodologyVersionStatus.ACTIVE,
        },
        data: {
          status: MethodologyVersionStatus.DELETED,
        },
      });

      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/carbon-inventories",
          payload: {
            usageMode: "SIMPLIFIED",
          },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("NO_ACTIVE_METHODOLOGY");
        expect(body.message).toBe("No active methodology version found");
      } finally {
        // Restore original statuses
        for (const { id, status } of originalStatusIds) {
          await prisma.methodologyVersion.update({
            where: { id },
            data: { status },
          });
        }
      }
    });
  });
});
