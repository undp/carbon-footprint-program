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
  cleanupCarbonInventoryTestData,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import type { CreateCarbonInventoryLineResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type {
  NotFoundErrorResponse,
  StructuredErrorResponse,
} from "@/commonSchemas/errors.js";
import {
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";

describe("POST /api/carbon-inventories/:id/subcategories/:subcategoryId/lines - Integration Tests", () => {
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
    it("should create a new empty line for a subcategory and return its ID", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(
        response.body
      ) as CreateCarbonInventoryLineResponse;

      // Validate the full line structure
      expect(body).toHaveProperty("id");
      expect(typeof body.id).toBe("string");
      expect(/^\d+$/.test(body.id)).toBe(true);
      expect(body).toHaveProperty("subcategoryId");
      expect(body.subcategoryId).toBe(String(firstSubcategoryId));
      expect(body).toHaveProperty("isManualTotalEmissions");
      expect(body.isManualTotalEmissions).toBe(false); // Empty line has no inputs
      expect(body).toHaveProperty("dimensionValue1Id");
      expect(body.dimensionValue1Id).toBeNull(); // Empty line has no dimensions
      expect(body).toHaveProperty("dimensionValue2Id");
      expect(body.dimensionValue2Id).toBeNull(); // Empty line has no dimensions
      expect(body).toHaveProperty("quantity");
      expect(body.quantity).toBeNull(); // Empty line has no quantity
      expect(body).toHaveProperty("measurementUnitId");
      expect(body.measurementUnitId).toBeNull();
      expect(body).toHaveProperty("factorSource");
      expect(body.factorSource).toBeNull();
      expect(body).toHaveProperty("factorValue");
      expect(body.factorValue).toBeNull();
      expect(body).toHaveProperty("factorRateMeasurementUnitId");
      expect(body.factorRateMeasurementUnitId).toBeNull();
      expect(body).toHaveProperty("comment");
      expect(body.comment).toBeNull();
      expect(body).toHaveProperty("manualTotalEmissions");
      expect(body.manualTotalEmissions).toBeNull();

      // Verify the line was created in the database
      const line = await prisma.carbonInventoryLine.findUnique({
        where: {
          id: BigInt(body.id),
        },
      });

      expect(line).toBeDefined();
      expect(line?.carbonInventoryId).toBe(carbonInventory.id);
      expect(line?.subcategoryId).toBe(firstSubcategoryId);

      // Verify the line has no inputs (empty line)
      const inputs = await prisma.carbonInventoryLineInput.findMany({
        where: {
          lineId: BigInt(body.id),
        },
      });

      expect(inputs).toHaveLength(0);
    });

    it("should create multiple lines for the same subcategory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      // Create first line
      const response1 = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines`,
      });

      expect(response1.statusCode).toBe(201);
      const body1 = JSON.parse(
        response1.body
      ) as CreateCarbonInventoryLineResponse;

      // Create second line for the same subcategory
      const response2 = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines`,
      });

      expect(response2.statusCode).toBe(201);
      const body2 = JSON.parse(
        response2.body
      ) as CreateCarbonInventoryLineResponse;

      // Both lines should have different IDs
      expect(body1.id).not.toBe(body2.id);

      // Both should have the same subcategoryId
      expect(body1.subcategoryId).toBe(String(firstSubcategoryId));
      expect(body2.subcategoryId).toBe(String(firstSubcategoryId));

      // Verify both lines exist
      const line1 = await prisma.carbonInventoryLine.findUnique({
        where: {
          id: BigInt(body1.id),
        },
      });

      const line2 = await prisma.carbonInventoryLine.findUnique({
        where: {
          id: BigInt(body2.id),
        },
      });

      expect(line1).toBeDefined();
      expect(line2).toBeDefined();
      expect(line1?.subcategoryId).toBe(firstSubcategoryId);
      expect(line2?.subcategoryId).toBe(firstSubcategoryId);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when carbon inventory does not exist", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${nonExistentId}/subcategories/1/lines`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Carbon inventory not found");
    });

    it("should return 404 when carbon inventory has no methodology", async () => {
      // Create a carbon inventory without a methodology
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: null }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/1/lines`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Methodology not found");
    });

    it("should return 404 when subcategory does not exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const nonExistentSubcategoryId = "999999";

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${nonExistentSubcategoryId}/lines`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Subcategory not found");
    });

    it("should return 422 when subcategory does not belong to the carbon inventory's methodology", async () => {
      const methodologyId1 = await getTestMethodologyVersionId(prisma);
      const emptyMethodology = await createEmptyMethodologyVersion(prisma);

      // Create a carbon inventory with methodology 1
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId1 }
      );

      // Create a category in methodology 2
      const category = await prisma.category.create({
        data: {
          methodologyVersionId: emptyMethodology.id,
          name: "Test Category",
          position: 1,
        },
      });

      // Create a subcategory in methodology 2
      const subcategoryInMethodology2 = await prisma.subcategory.create({
        data: {
          categoryId: category.id,
          name: "Test Subcategory",
        },
      });

      // Try to create a line with subcategory from methodology 2
      // but carbon inventory uses methodology 1
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryInMethodology2.id}/lines`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as StructuredErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_NOT_IN_METHODOLOGY");
      expect(body.message).toBe(
        "Subcategory does not belong to the carbon inventory's methodology"
      );
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid carbon inventory ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/invalid-id/subcategories/1/lines",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (decimal)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/123.45/subcategories/1/lines",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (negative)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/-123/subcategories/1/lines",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (non-numeric)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/invalid-id/lines`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (decimal)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/123.45/lines`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (negative)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/-123/lines`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
