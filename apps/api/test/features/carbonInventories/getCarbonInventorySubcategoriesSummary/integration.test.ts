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
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  getSubcategoryIds,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
} from "@test/factories/carbonInventorySeeder.js";
import {
  type GetCarbonInventorySubcategoriesSummaryResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, Prisma } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";
import { getCarbonInventorySubcategoriesSummaryService } from "@/features/carbonInventories/getCarbonInventorySubcategoriesSummary/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("GET /api/carbon-inventories/:id/subcategories/summary - Integration Tests", () => {
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
  });

  describe("Successful retrieval", () => {
    it("should return empty array for inventory with no lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      // Should return all subcategories from methodology, all with included=false and edited=false
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(body).toHaveLength(subcategoryIds.length);

      body.forEach((item) => {
        expect(item).toHaveProperty("subcategoryId");
        expect(item).toHaveProperty("included");
        expect(item).toHaveProperty("edited");
        expect(item.included).toBe(false);
        expect(item.edited).toBe(false);
        expect(typeof item.subcategoryId).toBe("string");
        expect(typeof item.included).toBe("boolean");
        expect(typeof item.edited).toBe("boolean");
      });
    });

    it("should return subcategories with included=true and edited=false for lines without inputs or selections", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create a line with no selections and no input
      const firstSubcategoryId = subcategoryIds[0];
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(false);
    });

    it("should return edited=true for lines with selection1Id", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Get a dimension value to use as selection
      const dimensionValue =
        await prisma.emissionFactorDimensionValue.findFirst({
          select: { id: true },
        });

      if (!dimensionValue) {
        throw new Error(
          "Emission factor dimension value not found in database. Please ensure the database is properly seeded."
        );
      }

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        selection1Id: dimensionValue.id,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });

    it("should return edited=true for lines with selection2Id", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Get a dimension value to use as selection
      const dimensionValue =
        await prisma.emissionFactorDimensionValue.findFirst({
          select: { id: true },
        });

      if (!dimensionValue) {
        throw new Error(
          "Emission factor dimension value not found in database. Please ensure the database is properly seeded."
        );
      }

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        selection2Id: dimensionValue.id,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });

    it("should return edited=true for lines with active input", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        quantity: new Prisma.Decimal(100),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });

    it("should return edited=true when line has both selections and input", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Get dimension values to use as selections
      const dimensionValues =
        await prisma.emissionFactorDimensionValue.findMany({
          take: 2,
          select: { id: true },
        });

      if (dimensionValues.length < 2) {
        throw new Error(
          "At least 2 emission factor dimension values not found in database. Please ensure the database is properly seeded."
        );
      }

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        selection1Id: dimensionValues[0].id,
        selection2Id: dimensionValues[1].id,
        quantity: new Prisma.Decimal(50),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });

    it("should return edited=false when line only has inactive input", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        quantity: new Prisma.Decimal(100),
        isActive: false,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      expect(firstSubcategory).toBeDefined();
      expect(firstSubcategory?.included).toBe(true);
      // Should be false because there's no active input and no selections
      expect(firstSubcategory?.edited).toBe(false);
    });

    it("should handle multiple subcategories correctly", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create lines for first two subcategories with different states
      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      await createCarbonInventoryLineInput(prisma, line1.id, {
        quantity: new Prisma.Decimal(100),
      });

      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1]
      ); // No input, no selections

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      // Verify all subcategories are present
      expect(body).toHaveLength(subcategoryIds.length);

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === subcategoryIds[0].toString()
      );
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);

      const secondSubcategory = body.find(
        (item) => item.subcategoryId === subcategoryIds[1].toString()
      );
      expect(secondSubcategory?.included).toBe(true);
      expect(secondSubcategory?.edited).toBe(false);

      // Other subcategories should be included=false
      const otherSubcategories = body.filter(
        (item) =>
          item.subcategoryId !== subcategoryIds[0].toString() &&
          item.subcategoryId !== subcategoryIds[1].toString()
      );
      otherSubcategories.forEach((item) => {
        expect(item.included).toBe(false);
        expect(item.edited).toBe(false);
      });
    });

    it("should ignore deleted/inactive lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      // Create a deleted line
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId,
        {
          status: CarbonInventoryLineStatus.DELETED,
        }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      // Deleted lines should not be included
      expect(firstSubcategory?.included).toBe(false);
      expect(firstSubcategory?.edited).toBe(false);
    });

    it("should return response with correct structure", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      expect(Array.isArray(body)).toBe(true);

      if (body.length > 0) {
        const item = body[0];
        expect(item).toHaveProperty("subcategoryId");
        expect(item).toHaveProperty("included");
        expect(item).toHaveProperty("edited");
        expect(typeof item.subcategoryId).toBe("string");
        expect(typeof item.included).toBe("boolean");
        expect(typeof item.edited).toBe("boolean");
        expect(item.subcategoryId.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for non-existent carbon inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/subcategories/summary",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/invalid-id/subcategories/summary",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (decimal)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/123.45/subcategories/summary",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (negative)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/-123/subcategories/summary",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty methodology (no subcategories)", async () => {
      // This test verifies the endpoint handles edge case gracefully
      // In practice, methodologies should have subcategories, but we test the behavior

      // Create a methodology version with no categories (and therefore no subcategories)
      const emptyMethodologyVersion =
        await createEmptyMethodologyVersion(prisma);

      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: emptyMethodologyVersion.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;
      expect(Array.isArray(body)).toBe(true);
      // Should return empty array since methodology has no subcategories
      expect(body).toHaveLength(0);
    });

    it("should handle lines with only comment input (no quantity, no emissions)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        comment: "Test comment",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === firstSubcategoryId.toString()
      );
      // Even with just a comment, if there's an active input, it's considered edited
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        getCarbonInventorySubcategoriesSummaryService(prisma, 999999999n)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });
  });
});
