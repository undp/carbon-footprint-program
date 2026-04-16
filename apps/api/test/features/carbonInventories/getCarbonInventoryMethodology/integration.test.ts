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
import type { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import { CategoryStatus, SubcategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createInventoryFromPattern,
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";

describe("GET /api/carbon-inventories/:id/methodology - Integration Tests", () => {
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
    it("should return a methodology with expected structure", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      expect(body).toHaveProperty("name");
      expect(body).toHaveProperty("description");
      expect(body).toHaveProperty("categories");
      expect(Array.isArray(body.categories)).toBe(true);
      expect(typeof body.name).toBe("string");
      expect(
        body.description === null || typeof body.description === "string"
      ).toBe(true);
    });

    it("should return methodology with categories", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      expect(body.categories.length).toBeGreaterThan(0);

      const category = body.categories[0];
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("synonyms");
      expect(category).toHaveProperty("description");
      expect(category).toHaveProperty("examples");
      expect(category).toHaveProperty("position");
      expect(category).toHaveProperty("subcategories");
      expect(Array.isArray(category.subcategories)).toBe(true);
      expect(typeof category.position).toBe("number");
    });

    it("should return subcategories with dimensions", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      // Find a subcategory with dimensions
      const subcategoryWithDimensions = body.categories
        .flatMap((cat) => cat.subcategories)
        .find((sub) => sub.dimensions.length > 0);

      if (subcategoryWithDimensions) {
        expect(subcategoryWithDimensions.dimensions.length).toBeGreaterThan(0);

        const dimension = subcategoryWithDimensions.dimensions[0];
        expect(dimension).toHaveProperty("id");
        expect(dimension).toHaveProperty("name");
        expect(dimension).toHaveProperty("position");
        expect(dimension).toHaveProperty("isRequired");
        expect(dimension).toHaveProperty("values");
        expect(Array.isArray(dimension.values)).toBe(true);
        expect(typeof dimension.id).toBe("string");
        expect(typeof dimension.name).toBe("string");
        expect(typeof dimension.position).toBe("number");
        expect(typeof dimension.isRequired).toBe("boolean");
      }
    });

    it("should return dimension values with parentValueId when applicable", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      // Find a dimension value with a parent
      const dimensionValueWithParent = body.categories
        .flatMap((cat) => cat.subcategories)
        .flatMap((sub) => sub.dimensions)
        .flatMap((dim) => dim.values)
        .find((val) => val.parentValueId !== null);

      if (dimensionValueWithParent) {
        expect(dimensionValueWithParent.parentValueId).not.toBeNull();
        expect(typeof dimensionValueWithParent.parentValueId).toBe("string");
        expect(dimensionValueWithParent.parentValueId).toMatch(/^\d+$/);
      }

      // Verify all dimension values have the correct structure
      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          subcategory.dimensions.forEach((dimension) => {
            dimension.values.forEach((value) => {
              expect(value).toHaveProperty("id");
              expect(value).toHaveProperty("value");
              expect(value).toHaveProperty("parentValueId");
              expect(typeof value.id).toBe("string");
              expect(typeof value.value).toBe("string");
              expect(
                value.parentValueId === null ||
                  typeof value.parentValueId === "string"
              ).toBe(true);
              if (value.parentValueId !== null) {
                expect(value.parentValueId).toMatch(/^\d+$/);
              }
            });
          });
        });
      });
    });

    it("should include emissionFactors in subcategories", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      // Check that subcategories have emissionFactors property
      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          expect(subcategory).toHaveProperty("emissionFactors");
          expect(Array.isArray(subcategory.emissionFactors)).toBe(true);

          // If there are emission factors, verify their structure
          if (subcategory.emissionFactors.length > 0) {
            const emissionFactor = subcategory.emissionFactors[0];
            expect(emissionFactor).toHaveProperty("id");
            expect(emissionFactor).toHaveProperty("originalEmissionFactorId");
            expect(emissionFactor).toHaveProperty("dimensionValue1Id");
            expect(emissionFactor).toHaveProperty("dimensionValue2Id");
            expect(emissionFactor).toHaveProperty("rateMeasurementUnitId");
            expect(emissionFactor).toHaveProperty("source");
            expect(emissionFactor).toHaveProperty("gasDetails");
            expect(emissionFactor).toHaveProperty("value");
            expect(emissionFactor).not.toHaveProperty("dimensionValue1");
            expect(emissionFactor).not.toHaveProperty("dimensionValue2");
            expect(emissionFactor).not.toHaveProperty("rateMeasurementUnit");
            expect(emissionFactor).not.toHaveProperty("status");
            expect(typeof emissionFactor.id).toBe("string");
            expect(
              emissionFactor.originalEmissionFactorId === null ||
                typeof emissionFactor.originalEmissionFactorId === "string"
            ).toBe(true);
            if (emissionFactor.originalEmissionFactorId !== null) {
              expect(emissionFactor.originalEmissionFactorId).toMatch(/^\d+$/);
            }
            expect(
              emissionFactor.dimensionValue1Id === null ||
                typeof emissionFactor.dimensionValue1Id === "string"
            ).toBe(true);
            expect(
              emissionFactor.dimensionValue2Id === null ||
                typeof emissionFactor.dimensionValue2Id === "string"
            ).toBe(true);
            expect(typeof emissionFactor.rateMeasurementUnitId).toBe("string");
            expect(typeof emissionFactor.source).toBe("string");
            expect(typeof emissionFactor.value).toBe("string");
          }
        });
      });
    });

    it("should exclude deleted categories from the response", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);

      // Create a deleted category on the seeded methodology
      const deletedCategory = await createTestCategory(prisma, methodologyId, {
        name: "Test - Deleted Category",
        position: 999,
        status: CategoryStatus.DELETED,
      });

      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      const categoryIds = body.categories.map((cat) => cat.id);
      expect(categoryIds).not.toContain(deletedCategory.id.toString());

      // Cleanup the deleted category
      await prisma.category.delete({ where: { id: deletedCategory.id } });
    });

    it("should exclude deleted subcategories from the response", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);

      // Get an existing active category to attach a deleted subcategory
      const activeCategory = await prisma.category.findFirst({
        where: {
          methodologyVersionId: methodologyId,
          status: CategoryStatus.ACTIVE,
        },
      });
      expect(activeCategory).toBeDefined();

      const deletedSubcategory = await createTestSubcategory(
        prisma,
        activeCategory!.id,
        {
          name: "Test - Deleted Subcategory",
          status: SubcategoryStatus.DELETED,
        }
      );

      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      const allSubcategoryIds = body.categories.flatMap((cat) =>
        cat.subcategories.map((sub) => sub.id)
      );
      expect(allSubcategoryIds).not.toContain(deletedSubcategory.id.toString());

      // Cleanup the deleted subcategory
      await prisma.subcategory.delete({
        where: { id: deletedSubcategory.id },
      });
    });

    it("should include originalEmissionFactorId in emission factors with correct relationships", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      // Find a subcategory with emission factors
      const subcategoryWithFactors = body.categories
        .flatMap((cat) => cat.subcategories)
        .find((sub) => sub.emissionFactors.length > 0);

      // Ensure we have emission factors to test
      expect(subcategoryWithFactors).toBeDefined();
      expect(subcategoryWithFactors!.emissionFactors.length).toBeGreaterThan(0);

      if (subcategoryWithFactors) {
        const emissionFactors = subcategoryWithFactors.emissionFactors;

        // Group emission factors by originalEmissionFactorId
        const originalFactors = emissionFactors.filter(
          (ef) => ef.originalEmissionFactorId === null
        );
        const convertedFactors = emissionFactors.filter(
          (ef) => ef.originalEmissionFactorId !== null
        );

        // Verify original factors have null originalEmissionFactorId and numeric IDs
        originalFactors.forEach((factor) => {
          expect(factor.originalEmissionFactorId).toBeNull();
          expect(factor.id).toMatch(/^\d+$/); // Original IDs should be numeric only
        });

        // Verify converted factors have originalEmissionFactorId set and composite IDs
        convertedFactors.forEach((factor) => {
          expect(factor.originalEmissionFactorId).not.toBeNull();
          expect(typeof factor.originalEmissionFactorId).toBe("string");
          expect(factor.originalEmissionFactorId).toMatch(/^\d+$/);
          // Converted factors should have composite IDs: `${originalId}-${rateMeasurementUnitId}`
          expect(factor.id).toContain("-");
          expect(factor.id).toMatch(/^\d+-\d+$/);

          // Verify the originalEmissionFactorId references an actual original factor
          const originalId = factor.originalEmissionFactorId;
          const originalFactor = originalFactors.find(
            (ef) => ef.id === originalId
          );
          expect(originalFactor).toBeDefined();
          expect(originalFactor?.id).toBe(originalId);
        });

        // Verify that each original factor has at least one entry (itself)
        expect(originalFactors.length).toBeGreaterThan(0);

        // Verify all original IDs are unique
        const originalIds = originalFactors.map((ef) => ef.id);
        const uniqueOriginalIds = new Set(originalIds);
        expect(originalIds.length).toBe(uniqueOriginalIds.size);
      }
    });
  });

  describe("Data integrity", () => {
    it("should have valid category IDs as strings", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        expect(typeof category.id).toBe("string");
        expect(category.id).toMatch(/^\d+$/);
      });
    });

    it("should have valid subcategory IDs as strings", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          expect(typeof subcategory.id).toBe("string");
          expect(subcategory.id).toMatch(/^\d+$/);
        });
      });
    });

    it("should have categories ordered by position", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      const positions = body.categories.map((cat) => cat.position);
      const sortedPositions = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sortedPositions);
    });

    it("should have subcategories ordered by name", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        const subcategoryNames = category.subcategories.map((sub) => sub.name);
        const sortedNames = [...subcategoryNames].sort();
        expect(subcategoryNames).toEqual(sortedNames);
      });
    });

    it("should have dimensions ordered by position", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          const positions = subcategory.dimensions.map((dim) => dim.position);
          const sortedPositions = [...positions].sort((a, b) => a - b);
          expect(positions).toEqual(sortedPositions);
        });
      });
    });

    it("should have dimension values ordered by value", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          subcategory.dimensions.forEach((dimension) => {
            const values = dimension.values.map((val) => val.value);
            const sortedValues = [...values].sort();
            expect(values).toEqual(sortedValues);
          });
        });
      });
    });
  });

  describe("Error cases", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 with 'FORBIDDEN' when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/methodology",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
