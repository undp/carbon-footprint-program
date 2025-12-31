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
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
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
      expect(category).toHaveProperty("subcategories");
      expect(Array.isArray(category.subcategories)).toBe(true);
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

    it("should have categories ordered by name", async () => {
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

      const categoryNames = body.categories.map((cat) => cat.name);
      const sortedNames = [...categoryNames].sort();
      expect(categoryNames).toEqual(sortedNames);
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
    it("should return 404 with 'Carbon inventory not found' when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/methodology",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Carbon inventory not found");
    });

    it("should return 404 with 'Methodology not found' when carbon inventory has no methodology", async () => {
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: null }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Methodology not found");
    });
  });
});
