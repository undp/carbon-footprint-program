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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import type { CreateCategoryResponse } from "@repo/types";
import { CategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/categories/ - Integration Tests", () => {
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
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  /**
   * Helper to build a valid category payload for a given methodology version ID.
   * Uses a random suffix to avoid unique constraint collisions between tests.
   */
  function buildCategoryPayload(
    methodologyVersionId: string,
    overrides?: Record<string, unknown>
  ) {
    const randomSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    return {
      methodologyVersionId,
      name: `Test - Category ${randomSuffix}`,
      icon: "FACTORY",
      color: "#FF0000",
      synonyms: "synonym1, synonym2",
      description: "Test category description",
      position: 1,
      ...overrides,
    };
  }

  describe("Successful creation", () => {
    it("should create a category and return 201", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - For Category Creation",
      });

      const payload = buildCategoryPayload(methodology.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCategoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.name).toBe(payload.name);
      expect(body.icon).toBe(payload.icon);
      expect(body.color).toBe(payload.color);
      expect(body.synonyms).toBe(payload.synonyms);
      expect(body.description).toBe(payload.description);
      expect(body.position).toBe(payload.position);
      expect(body.status).toBe(CategoryStatus.ACTIVE);
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeFalsy();
    });

    it("should persist the category in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Persist Category",
      });

      const payload = buildCategoryPayload(methodology.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCategoryResponse;

      const dbRecord = await prisma.category.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord!.name).toBe(payload.name);
      expect(dbRecord!.icon).toBe(payload.icon);
      expect(dbRecord!.color).toBe(payload.color);
      expect(dbRecord!.synonyms).toBe(payload.synonyms);
      expect(dbRecord!.description).toBe(payload.description);
      expect(dbRecord!.position).toBe(payload.position);
      expect(dbRecord!.status).toBe(CategoryStatus.ACTIVE);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload: {
          name: "Test - Incomplete Category",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when position is less than 1", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Invalid Position",
      });

      const payload = buildCategoryPayload(methodology.id.toString(), {
        position: 0,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Methodology validation", () => {
    it("should return 404 when methodology version does not exist", async () => {
      const payload = buildCategoryPayload("999999");

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY");
    });

    it("should return 404 when methodology version is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Deleted Methodology",
        status: MethodologyVersionStatus.DELETED,
      });

      const payload = buildCategoryPayload(methodology.id.toString());

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_VERSION_NOT_FOUND_FOR_CATEGORY");
    });
  });

  describe("Unique constraint violations", () => {
    it("should return 409 when category name already exists for the same methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Name Methodology",
      });

      const existingCategory = await createTestCategory(
        prisma,
        methodology.id,
        { name: "Test - Duplicate Category Name", position: 1 }
      );

      const payload = buildCategoryPayload(methodology.id.toString(), {
        name: existingCategory.name,
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NAME_ALREADY_EXISTS");
    });

    it("should return 409 when category position already exists for the same methodology", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Position Methodology",
      });

      await createTestCategory(prisma, methodology.id, {
        name: "Test - Existing Position Category",
        position: 1,
      });

      const payload = buildCategoryPayload(methodology.id.toString(), {
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_POSITION_ALREADY_EXISTS");
    });
  });
});
