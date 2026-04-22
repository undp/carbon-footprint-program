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
  getTestMeasurementUnitIds,
} from "@test/factories/subcategoryFactory.js";
import type { CreateSubcategoryResponse } from "@repo/types";
import { CategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/subcategories/ - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

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
  });

  /**
   * Helper to build a valid subcategory payload.
   */
  function buildSubcategoryPayload(
    categoryId: string,
    overrides?: Record<string, unknown>
  ) {
    const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      categoryId,
      name: `Test - Subcategory ${randomSuffix}`,
      icon: "FACTORY",
      description: "Test subcategory description",
      measurementUnitIds: [],
      ...overrides,
    };
  }

  describe("Successful creation", () => {
    it("should create a subcategory and return 201", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - For Subcategory Creation",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Parent Category",
        position: 1,
      });

      const payload = buildSubcategoryPayload(category.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateSubcategoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.name).toBe(payload.name);
      expect(body.icon).toBe(payload.icon);
      expect(body.description).toBe(payload.description);
      expect(body.explanation).toBeNull();
      expect(body.category).toEqual({
        id: category.id.toString(),
        name: category.name,
        color: category.color,
      });
      expect(body.measurementUnits).toEqual([]);
    });

    it("should persist the subcategory in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Persist Subcategory",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Persist Parent",
        position: 1,
      });

      const payload = buildSubcategoryPayload(category.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateSubcategoryResponse;

      const dbRecord = await prisma.subcategory.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord!.name).toBe(payload.name);
      expect(dbRecord!.icon).toBe(payload.icon);
      expect(dbRecord!.description).toBe(payload.description);
    });

    it("should create measurement unit associations", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategory With Units",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Units Parent",
        position: 1,
      });

      const unitIds = await getTestMeasurementUnitIds(prisma, 2);
      const payload = buildSubcategoryPayload(category.id.toString(), {
        measurementUnitIds: unitIds.map((id) => id.toString()),
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateSubcategoryResponse;

      expect(body.measurementUnits).toHaveLength(2);
      expect(body.measurementUnits.map((unit) => unit.id)).toEqual(
        expect.arrayContaining(unitIds.map((id) => id.toString()))
      );
      for (const unit of body.measurementUnits) {
        expect(typeof unit.name).toBe("string");
        expect(unit.name.length).toBeGreaterThan(0);
      }

      // Verify in database
      const dbUnits = await prisma.subcategoryMeasurementUnit.findMany({
        where: { subcategoryId: BigInt(body.id) },
      });
      expect(dbUnits).toHaveLength(2);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload: {
          name: "Test - Incomplete Subcategory",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Category validation", () => {
    it("should return 404 when category does not exist", async () => {
      const payload = buildSubcategoryPayload("999999");

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND_FOR_SUBCATEGORY");
    });

    it("should return 404 when category is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Deleted Category Parent",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Deleted Parent",
        position: 1,
        status: CategoryStatus.DELETED,
      });

      const payload = buildSubcategoryPayload(category.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND_FOR_SUBCATEGORY");
    });
  });

  describe("Unique constraint violations", () => {
    it("should return 409 when subcategory name already exists for the same category", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Subcategory Name",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Dup Name Parent",
        position: 1,
      });

      const existingSubcategory = await createTestSubcategory(
        prisma,
        category.id,
        { name: "Test - Duplicate Name" }
      );

      const payload = buildSubcategoryPayload(category.id.toString(), {
        name: existingSubcategory.name,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NAME_ALREADY_EXISTS");
    });
  });
});
