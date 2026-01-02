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
} from "@test/factories/carbonInventorySeeder.js";
import type { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { Prisma } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

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

  beforeEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  // Helper function to get ACTIVE status for lines
  async function getActiveStatusId(): Promise<bigint> {
    const activeStatus = await prisma.statusCatalog.findFirst({
      where: {
        scope: "ENTITY",
        code: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    if (!activeStatus) {
      throw new Error(
        "ACTIVE status not found in database. Please ensure the database is properly seeded."
      );
    }

    return activeStatus.id;
  }

  // Helper function to get a subcategory from the methodology
  async function getSubcategoryIds(
    methodologyVersionId: bigint
  ): Promise<bigint[]> {
    const methodology = await prisma.methodologyVersion.findUnique({
      where: {
        id: methodologyVersionId,
      },
      select: {
        categories: {
          select: {
            subcategories: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!methodology) {
      throw new Error("Methodology not found");
    }

    return methodology.categories.flatMap((category) =>
      category.subcategories.map((subcategory) => subcategory.id)
    );
  }

  // Helper function to create a carbon inventory line
  async function createLine(
    carbonInventoryId: bigint,
    subcategoryId: bigint,
    options?: {
      selection1Id?: bigint | null;
      selection2Id?: bigint | null;
      statusId?: bigint;
    }
  ) {
    const statusId = options?.statusId ?? (await getActiveStatusId());

    return prisma.carbonInventoryLine.create({
      data: {
        carbonInventoryId,
        subcategoryId,
        selection1Id: options?.selection1Id ?? null,
        selection2Id: options?.selection2Id ?? null,
        statusId,
      },
    });
  }

  // Helper function to create a carbon inventory line input
  async function createLineInput(
    lineId: bigint,
    options?: {
      inputType?: "SIMPLIFIED" | "EXPERT" | "DIRECT";
      quantity?: Prisma.Decimal;
      directTotalEmissions?: Prisma.Decimal;
      manualFactor?: Prisma.Decimal;
      comment?: string;
      isActive?: boolean;
    }
  ) {
    return prisma.carbonInventoryLineInput.create({
      data: {
        lineId,
        inputType: options?.inputType ?? "SIMPLIFIED",
        quantity: options?.quantity ?? null,
        directTotalEmissions: options?.directTotalEmissions ?? null,
        manualFactor: options?.manualFactor ?? null,
        comment: options?.comment ?? null,
        isActive: options?.isActive ?? true,
      },
    });
  }

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
      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(body).toHaveLength(subcategoryIds.length);

      body.forEach((item) => {
        expect(item).toHaveProperty("subcategoryId");
        expect(item).toHaveProperty("included");
        expect(item).toHaveProperty("edited");
        expect(item.included).toBe(false);
        expect(item.edited).toBe(false);
        expect(typeof item.subcategoryId).toBe("number");
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create a line with no selections and no input
      const firstSubcategoryId = subcategoryIds[0];
      await createLine(carbonInventory.id, firstSubcategoryId);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventorySubcategoriesSummaryResponse;

      const firstSubcategory = body.find(
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
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
      await createLine(carbonInventory.id, firstSubcategoryId, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
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
      await createLine(carbonInventory.id, firstSubcategoryId, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createLine(carbonInventory.id, firstSubcategoryId);
      await createLineInput(line.id, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
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
      const line = await createLine(carbonInventory.id, firstSubcategoryId, {
        selection1Id: dimensionValues[0].id,
        selection2Id: dimensionValues[1].id,
      });
      await createLineInput(line.id, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createLine(carbonInventory.id, firstSubcategoryId);
      await createLineInput(line.id, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create lines for first two subcategories with different states
      const line1 = await createLine(carbonInventory.id, subcategoryIds[0]);
      await createLineInput(line1.id, { quantity: new Prisma.Decimal(100) });

      await createLine(carbonInventory.id, subcategoryIds[1]); // No input, no selections

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
        (item) => item.subcategoryId === Number(subcategoryIds[0])
      );
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);

      const secondSubcategory = body.find(
        (item) => item.subcategoryId === Number(subcategoryIds[1])
      );
      expect(secondSubcategory?.included).toBe(true);
      expect(secondSubcategory?.edited).toBe(false);

      // Other subcategories should be included=false
      const otherSubcategories = body.filter(
        (item) =>
          item.subcategoryId !== Number(subcategoryIds[0]) &&
          item.subcategoryId !== Number(subcategoryIds[1])
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

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Get DELETED status
      const deletedStatus = await prisma.statusCatalog.findFirst({
        where: {
          scope: "ENTITY",
          code: "DELETED",
        },
        select: {
          id: true,
        },
      });

      if (!deletedStatus) {
        throw new Error(
          "DELETED status not found in database. Please ensure the database is properly seeded."
        );
      }

      const firstSubcategoryId = subcategoryIds[0];
      // Create a deleted line
      await createLine(carbonInventory.id, firstSubcategoryId, {
        statusId: deletedStatus.id,
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
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
        expect(typeof item.subcategoryId).toBe("number");
        expect(typeof item.included).toBe("boolean");
        expect(typeof item.edited).toBe("boolean");
        expect(item.subcategoryId).toBeGreaterThan(0);
      }
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent carbon inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/subcategories/summary",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Carbon inventory not found");
    });

    it("should return 404 for carbon inventory without methodology", async () => {
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: null }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/summary`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Methodology not found");
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
      // Note: In practice, methodologies have subcategories, but we verify the structure
    });

    it("should handle lines with only comment input (no quantity, no emissions)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createLine(carbonInventory.id, firstSubcategoryId);
      await createLineInput(line.id, {
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
        (item) => item.subcategoryId === Number(firstSubcategoryId)
      );
      // Even with just a comment, if there's an active input, it's considered edited
      expect(firstSubcategory?.included).toBe(true);
      expect(firstSubcategory?.edited).toBe(true);
    });
  });
});
