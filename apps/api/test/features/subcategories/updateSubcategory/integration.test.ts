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
import { updateSubcategoryService } from "@/features/subcategories/updateSubcategory/service.js";
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
          icon: "TRUCK",
          description: "Updated description",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.name).toBe("Updated Multi Name");
      expect(body.icon).toBe("TRUCK");
      expect(body.description).toBe("Updated description");
    });

    it("should only update provided fields, leaving others unchanged", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Partial Update",
        icon: "FACTORY",
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
      expect(body.icon).toBe("FACTORY");
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

  describe("Additional field updates", () => {
    it("should move the subcategory to a new category within the same methodology", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Move Category",
      });

      const methodology = await prisma.category.findUniqueOrThrow({
        where: { id: categoryId },
        select: { methodologyVersionId: true },
      });
      const newCategory = await createTestCategory(
        prisma,
        methodology.methodologyVersionId,
        {
          name: "Test - New Target Category",
          position: 2,
        }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          categoryId: newCategory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.category.id).toBe(newCategory.id.toString());
    });

    it("should update explanation only", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Explanation Update",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          explanation: "Updated explanation",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateSubcategoryResponse;
      expect(body.explanation).toBe("Updated explanation");
    });

    // The service's own catch block only maps P2002 (name conflicts) to a
    // domain error; a foreign-key violation from an invalid
    // measurementUnitId falls through its `if (error.code === "P2002")`
    // check (the false branch of that condition) and is re-thrown raw, to
    // be handled by the global Prisma-error safety net in errorHandler.ts.
    it("should surface a database error when measurementUnitIds references a non-existent unit", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Invalid Measurement Unit",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/subcategories/${subcategory.id}`,
        payload: {
          measurementUnitIds: ["999999999"],
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DATABASE_FOREIGN_KEY_CONSTRAINT");
    });
  });

  describe("Direct service invocation (bypassing schema-level validation)", () => {
    // This route always runs behind auth (`access: { mode: "private" }`), so
    // `request.currentUser` is never null over HTTP. Call the service
    // directly with `user = null` to exercise the defensive
    // `if (!user) throw new UserNotFoundError()` guard.
    it("should return USER_NOT_FOUND when called without a user", async () => {
      const subcategory = await createTestSubcategory(prisma, categoryId, {
        name: "Test - Direct No User",
      });

      await expect(
        updateSubcategoryService(
          prisma,
          subcategory.id.toString(),
          { name: "Should Not Apply" },
          null
        )
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });
  });
});
