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
import type { GetCarbonInventoryMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { getTestMethodologyVersion } from "@test/factories/methodologyFactory.js";
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

  beforeEach(async () => {});

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return a methodology with expected structure", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      expect(body).toHaveProperty("country_iso_code");
      expect(body).toHaveProperty("name");
      expect(body).toHaveProperty("description");
      expect(body).toHaveProperty("status_code");
      expect(body).toHaveProperty("categories");
      expect(Array.isArray(body.categories)).toBe(true);
    });

    it("should return methodology with categories", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

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
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      // Find a subcategory with dimensions
      const subcategoryWithDimensions = body.categories
        .flatMap((cat) => cat.subcategories)
        .find((sub) => sub.emission_factor_dimensions.length > 0);

      if (subcategoryWithDimensions) {
        expect(
          subcategoryWithDimensions.emission_factor_dimensions.length
        ).toBeGreaterThan(0);

        const dimension =
          subcategoryWithDimensions.emission_factor_dimensions[0];
        expect(dimension).toHaveProperty("code");
        expect(dimension).toHaveProperty("name");
        expect(dimension).toHaveProperty("position");
        expect(dimension).toHaveProperty("is_required");
        expect(dimension).toHaveProperty("values");
        expect(Array.isArray(dimension.values)).toBe(true);
      }
    });

    it("should return dimension values with parent values when applicable", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      // Find a dimension value with a parent
      const dimensionWithParent = body.categories
        .flatMap((cat) => cat.subcategories)
        .flatMap((sub) => sub.emission_factor_dimensions)
        .flatMap((dim) => dim.values)
        .find((val) => val.parent_value !== null);

      if (dimensionWithParent) {
        expect(dimensionWithParent.parent_value).not.toBeNull();
        expect(dimensionWithParent.parent_value).toHaveProperty(
          "dimension_code"
        );
        expect(dimensionWithParent.parent_value).toHaveProperty("value_name");
      }
    });

    it("should not include emission_factors in the response", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      // Check that emission_factors is not in the response
      expect(body).not.toHaveProperty("emission_factors");

      // Check that subcategories don't have emission_factors
      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          expect(subcategory).not.toHaveProperty("emission_factors");
        });
      });
    });
  });

  describe("Data integrity", () => {
    it("should have valid country ISO code", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      expect(body.country_iso_code).toBeTruthy();
      expect(typeof body.country_iso_code).toBe("string");
      expect(body.country_iso_code.length).toBe(2);
    });

    it("should have valid status code", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      expect(body.status_code).toBeTruthy();
      expect(typeof body.status_code).toBe("string");
    });

    it("should have categories ordered by name", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      const categoryNames = body.categories.map((cat) => cat.name);
      const sortedNames = [...categoryNames].sort();
      expect(categoryNames).toEqual(sortedNames);
    });

    it("should have subcategories ordered by name", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        const subcategoryNames = category.subcategories.map((sub) => sub.name);
        const sortedNames = [...subcategoryNames].sort();
        expect(subcategoryNames).toEqual(sortedNames);
      });
    });

    it("should have dimensions ordered by position", async () => {
      const methodology = await getTestMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: methodology.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryMethodologyResponse;

      body.categories.forEach((category) => {
        category.subcategories.forEach((subcategory) => {
          const positions = subcategory.emission_factor_dimensions.map(
            (dim) => dim.position
          );
          const sortedPositions = [...positions].sort((a, b) => a - b);
          expect(positions).toEqual(sortedPositions);
        });
      });
    });
  });

  describe("Error cases", () => {
    it("should return 404 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/methodology",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when carbon inventory has no methodology", async () => {
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodology_version_id: null }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}/methodology`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

