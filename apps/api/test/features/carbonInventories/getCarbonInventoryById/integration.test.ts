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
  createCarbonInventoryLine,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import {
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryLineStatus,
  InventoryStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

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
      expect(body.status).toBe(InventoryStatus.DRAFT);
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.isEditable).toBe(true);
    });

    it("should return complete data including all nullable fields when populated", async () => {
      // Get pre-seeded test users to satisfy foreign key constraints
      const [creatorUser, updaterUser] = await getTestUsers(prisma, [
        "creator@test.com",
        "updater@test.com",
      ]);

      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const testInventory = await createInventoryFromPattern(prisma, () =>
        carbonInventoryPatterns.complete(
          BigInt(123),
          BigInt(456),
          BigInt(methodologyVersionId),
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
      expect(body.status).toBe(InventoryStatus.VERIFIED);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.methodologyVersionId).toBe(methodologyVersionId.toString());
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
      expect(body.status).toBe(InventoryStatus.DRAFT);
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
      expect(body.status).toBe(InventoryStatus.SUBMITTED);
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
      expect(body.status).toBe(InventoryStatus.VERIFIED);
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
      expect(body.status).toBe(InventoryStatus.DELETED);
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

  describe("Line filtering by status", () => {
    it("should only return ACTIVE lines and exclude DELETED lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create ACTIVE lines
      const activeLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );

      // Create DELETED lines
      const deletedLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.DELETED }
      );
      const deletedLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.DELETED }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify only ACTIVE lines are returned, grouped by subcategoryId
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      const returnedLineIds = allLines.map((line) => line.id);
      expect(returnedLineIds).toContain(activeLine1.id.toString());
      expect(returnedLineIds).toContain(activeLine2.id.toString());
      expect(returnedLineIds).not.toContain(deletedLine1.id.toString());
      expect(returnedLineIds).not.toContain(deletedLine2.id.toString());
      expect(allLines.length).toBe(2);

      // Verify lines are grouped by subcategoryId
      expect(body.subcategories.length).toBe(2);
      const subcategory1 = body.subcategories.find(
        (subcat) => subcat.id === subcategoryIds[0].toString()
      );
      const subcategory2 = body.subcategories.find(
        (subcat) => subcat.id === subcategoryIds[1].toString()
      );
      expect(subcategory1).toBeDefined();
      expect(subcategory2).toBeDefined();
      expect(subcategory1?.lines.length).toBe(1);
      expect(subcategory2?.lines.length).toBe(1);
    });

    it("should return empty lines array when all lines are DELETED", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create only DELETED lines
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.DELETED }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify no lines are returned (no subcategories when all lines are deleted)
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      expect(allLines).toEqual([]);
      expect(allLines.length).toBe(0);
      expect(body.subcategories.length).toBe(0);
    });

    it("should return all ACTIVE lines when no DELETED lines exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

      // Create multiple ACTIVE lines
      const activeLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine3 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[2],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify all ACTIVE lines are returned, grouped by subcategoryId
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      expect(allLines.length).toBe(3);
      const returnedLineIds = allLines.map((line) => line.id);
      expect(returnedLineIds).toContain(activeLine1.id.toString());
      expect(returnedLineIds).toContain(activeLine2.id.toString());
      expect(returnedLineIds).toContain(activeLine3.id.toString());

      // Verify lines are grouped by subcategoryId
      expect(body.subcategories.length).toBe(3);
      body.subcategories.forEach((subcat) => {
        expect(subcat.lines.length).toBe(1);
        expect(subcat.id).toBeTruthy();
        expect(subcat.isTotalManualEmissionsModeActive).toBe(false);
      });
    });
  });
});
