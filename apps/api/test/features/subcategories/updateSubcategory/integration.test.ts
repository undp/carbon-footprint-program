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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import {
  createTestSubcategory,
  createTestSubcategoryUnits,
  getTestMeasurementUnitIds,
} from "@test/factories/subcategoryFactory.js";
import type { UpdateSubcategoryResponse } from "@repo/types";
import { SubcategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("PATCH /api/subcategories/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let categoryId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });

    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Update Subcategory Methodology",
      status: MethodologyVersionStatus.UNPUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Update Parent Category",
      position: 1,
    });
    categoryId = category.id;
  });

  describe("Successful update", () => {
    it("should update a single field and return 200", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Original Name",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          name: "Updated Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.name).toBe("Updated Name");
    });

    it("should update multiple fields at once", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Multi Update",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          name: "Updated Multi Name",
          icon: "updated-icon",
          description: "Updated description",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.name).toBe("Updated Multi Name");
      expect(body.icon).toBe("updated-icon");
      expect(body.description).toBe("Updated description");
    });

    it("should only update provided fields, leaving others unchanged", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Partial Update",
        icon: "original-icon",
        description: "Original description",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          name: "Updated Partial Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.name).toBe("Updated Partial Name");
      expect(body.icon).toBe("original-icon");
      expect(body.description).toBe("Original description");
    });

    it("should replace measurement unit associations when provided", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Update Units",
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 3);
      // Start with first 2 units
      await createTestSubcategoryUnits(
        prisma,
        subcategory.id,
        unitIds.slice(0, 2)
      );

      // Update to last 2 units
      const newUnitIds = unitIds.slice(1).map((id) => id.toString());
      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          measurementUnitIds: newUnitIds,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.measurementUnits).toHaveLength(2);
      expect(body.measurementUnits.map((unit) => unit.id)).toEqual(
        expect.arrayContaining(newUnitIds)
      );
    });

    it("should clear all measurement units when empty array is provided", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Clear Units",
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 2);
      await createTestSubcategoryUnits(prisma, subcategory.id, unitIds);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          measurementUnitIds: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.measurementUnits).toEqual([]);
    });

    it("should not change measurement units when not provided in payload", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Keep Units",
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 2);
      await createTestSubcategoryUnits(prisma, subcategory.id, unitIds);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          name: "Updated Keep Units Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.measurementUnits).toHaveLength(2);
      expect(body.measurementUnits.map((unit) => unit.id)).toEqual(
        expect.arrayContaining(unitIds.map((id) => id.toString()))
      );
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent subcategory", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/subcategories/999999999",
        payload: {
          name: "Should Not Work",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when subcategory is deleted", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Deleted Subcategory",
        status: SubcategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          name: "Should Not Work",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 409 when updating to a duplicate name within the same category", async () => {
      await createTestSubcategory(prisma, categoryId, {
        name: "Test - Existing Name",
      });

      const subcategory2 = await createTestSubcategory(prisma, categoryId, {
        name: "Test - To Be Renamed",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory2.id}`,
        payload: {
          name: "Test - Existing Name",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NAME_ALREADY_EXISTS");
    });

    it("should return 404 when target category does not exist", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Non-existent Category",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          categoryId: "999999999",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND_FOR_SUBCATEGORY");
    });

    it("should return 422 when target category belongs to a different methodology", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Cross Methodology",
      });

      // Create a second methodology with its own category
      const otherMethodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Other Methodology",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });
      const otherCategory = await createTestCategory(
        prisma,
        otherMethodology.id,
        {
          name: "Test - Other Category",
          position: 1,
        }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          categoryId: otherCategory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_FROM_DIFFERENT_METHODOLOGY");
    });

    it("should return 400 when no fields are provided", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Empty Update",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
