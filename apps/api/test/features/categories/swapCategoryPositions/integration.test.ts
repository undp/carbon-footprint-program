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
import type { SwapCategoryPositionsResponse } from "@repo/types";
import { CategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/categories/swap-positions - Integration Tests", () => {
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

  describe("Successful swap", () => {
    it("should swap positions of two categories and return 201", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Positions",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap B",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as SwapCategoryPositionsResponse;
      expect(body.categories).toHaveLength(2);

      const returnedA = body.categories.find(
        (c) => c.id === catA.id.toString()
      );
      const returnedB = body.categories.find(
        (c) => c.id === catB.id.toString()
      );

      expect(returnedA!.position).toBe(2);
      expect(returnedB!.position).toBe(1);
    });

    it("should persist the swapped positions in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Persist DB",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Persist A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Persist B",
        position: 3,
      });

      await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      const [dbCatA, dbCatB] = await Promise.all([
        prisma.category.findUnique({ where: { id: catA.id } }),
        prisma.category.findUnique({ where: { id: catB.id } }),
      ]);

      expect(dbCatA!.position).toBe(3);
      expect(dbCatB!.position).toBe(1);
    });

    it("should not affect other categories in the same methodology version", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap No Side Effects",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Side A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Side B",
        position: 2,
      });
      const catC = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Side C",
        position: 3,
      });

      await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      const dbCatC = await prisma.category.findUnique({
        where: { id: catC.id },
      });

      expect(dbCatC!.position).toBe(3);
    });

    it("should return both categories with ACTIVE status", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Status Check",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Status A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Status B",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      const body = JSON.parse(response.body) as SwapCategoryPositionsResponse;
      const foundCatA = body.categories.find(
        (c) => c.id === catA.id.toString()
      );
      const foundCatB = body.categories.find(
        (c) => c.id === catB.id.toString()
      );
      expect(foundCatA).toBeDefined();
      expect(foundCatA!.status).toBe(CategoryStatus.ACTIVE);
      expect(foundCatB).toBeDefined();
      expect(foundCatB!.status).toBe(CategoryStatus.ACTIVE);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when categoryIdA does not exist", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap 404 A",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap 404 B",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: "999999999",
          categoryIdB: catB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 404 when categoryIdB does not exist", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap 404 B",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap 404 A",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: "999999999",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 404 when categoryIdA is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Deleted A",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Del A",
        position: 1,
        status: CategoryStatus.DELETED,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Del B",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 422 when both category IDs are the same", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Same ID",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const cat = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Same",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: cat.id.toString(),
          categoryIdB: cat.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SAME_CATEGORY");
    });

    it("should return 422 when categories belong to different methodology versions", async () => {
      const methodologyA = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Different Methodology A",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const methodologyB = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Different Methodology B",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodologyA.id, {
        name: "Test - Swap Diff Method A",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodologyB.id, {
        name: "Test - Swap Diff Method B",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORIES_FROM_DIFFERENT_METHODOLOGY_VERSIONS");
    });

    it("should return 404 when categoryIdB is deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Deleted B",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const catA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Del A2",
        position: 1,
      });
      const catB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Del B2",
        position: 2,
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: catA.id.toString(),
          categoryIdB: catB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when categoryIdA is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdB: "1",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when categoryIdB is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/categories/swap-positions",
        payload: {
          categoryIdA: "1",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
