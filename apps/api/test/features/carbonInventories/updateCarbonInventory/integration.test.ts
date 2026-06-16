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
  buildExpectedOrganizationData,
  cleanupCarbonInventoryTestData,
  seedCarbonInventory,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  InventoryStatus,
  type UpdateCarbonInventoryResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ApiErrorResponse,
} from "@/commonSchemas/errors.js";
import { createTestMembership } from "../../../factories/membershipFactory.js";
import {
  getTestLoggedUser,
  createTestUser,
  cleanupTestUsers,
} from "../../../factories/userFactory.js";

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

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
    await cleanupTestUsers(prisma);
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

    it("should soft-delete an inventory by updating status to DELETED", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          status: InventoryStatus.DELETED,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify status change in database
      const carbonInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(carbonInventory).toBeDefined();
      expect(carbonInventory!.status).toBe(InventoryStatus.DELETED);
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
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationId: organizationId.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationId).toBe(organizationId.toString());
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

      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        organizationData
      );
      expect(body.organizationData).toEqual(expectedOrganizationData);
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
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          usageMode: "EXPERT",
          organizationId: organizationId.toString(),
          organizationBranchId: "456",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.organizationId).toBe(organizationId.toString());
      expect(body.organizationBranchId).toBe("456");
    });

    it("should set nullable fields to null", async () => {
      const user = await getTestLoggedUser(prisma);

      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        organizationId,
        organizationBranchId: 456,
      });

      await createTestMembership(prisma, user.id, organizationId);

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

    it("should return complete data including all nullable fields when populated", async () => {
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const organizationData = {
        name: null,
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 1000,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          name: "Full Inventory",
          organizationId: organizationId.toString(),
          organizationBranchId: "789",
          organizationData,
          usageMode: "EXPERT",
          isEditable: false,
          preselectedNodesId: "999",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        organizationData
      );
      expect(body.year).toBe(2024);
      expect(body.name).toBe("Full Inventory");
      expect(body.organizationId).toBe(organizationId.toString());
      expect(body.organizationBranchId).toBe("789");
      expect(body.organizationData).toEqual(expectedOrganizationData);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.isEditable).toBe(false);
      expect(body.preselectedNodesId).toBe("999");
    });
  });

  describe("Authorization errors", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/999999",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
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
      const body = JSON.parse(response.body) as ApiErrorResponse;
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

    it("should return 400 when payload is empty", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {},
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

  describe("Year uniqueness per owner", () => {
    it("rejects a year already used by another standalone draft of the same creator", async () => {
      await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
      });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_YEAR_ALREADY_EXISTS");
      expect(body.details).toEqual({ year: 2025 });

      // The rejected update must not have been persisted.
      const dbDraft = await prisma.carbonInventory.findUnique({
        where: { id: draft.id },
      });
      expect(dbDraft?.year).toBeNull();
    });

    it("allows assigning a year when the creator only has year-less drafts", async () => {
      await seedCarbonInventory(prisma, { usageMode: "SIMPLIFIED" });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2025);
    });

    it("allows re-saving the same year on the same inventory", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: { year: 2025, name: "Mismo año" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2025);
      expect(body.name).toBe("Mismo año");
    });

    it("allows a different year for the same creator", async () => {
      await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
      });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2024 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2024);
    });

    it("does not conflict with a same-year inventory owned by a different creator", async () => {
      const otherUser = await createTestUser(prisma);
      await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
        createdById: otherUser.id,
      });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2025);
    });

    it("does not conflict with a same-year inventory that was soft-deleted", async () => {
      await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
        status: InventoryStatus.DELETED,
      });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2025);
    });

    it("rejects a year already used by another inventory of the same organization", async () => {
      const user = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(prisma, user.id, organization.id);

      await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
        organizationId: organization.id,
      });
      const draft = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        organizationId: organization.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${draft.id}`,
        payload: { year: 2025 },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_YEAR_ALREADY_EXISTS");
      expect(body.details).toEqual({ year: 2025 });
    });
  });

  describe("Timestamps", () => {
    it("should update the updatedAt timestamp", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

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

      expect(body.updatedAt).toBeTruthy();
      const updatedAt = new Date(body.updatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThan(
        new Date(body.createdAt).getTime()
      );

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
