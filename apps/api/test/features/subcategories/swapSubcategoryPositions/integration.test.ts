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
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import type {
  GetAllSubcategoriesResponse,
  SwapSubcategoryPositionsResponse,
} from "@repo/types";
import { SubcategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/subcategories/swap-positions - Integration Tests", () => {
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

  /** Methodology with one category holding `count` subcategories at positions 1..count. */
  async function createCategoryWithSubcategories(
    methodologyName: string,
    count: number
  ) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: methodologyName,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: `${methodologyName} Category`,
      position: 1,
    });
    const subcategories = [];
    for (let i = 1; i <= count; i++) {
      subcategories.push(
        await createTestSubcategory(prisma, category.id, {
          name: `${methodologyName} Sub ${i}`,
        })
      );
    }

    return { methodology, category, subcategories };
  }

  describe("Successful swap", () => {
    it("should swap positions of two subcategories and return 201", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap Subcategories",
        2
      );
      const [subA, subB] = subcategories;

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(
        response.body
      ) as SwapSubcategoryPositionsResponse;

      const returnedA = body.subcategories.find(
        (s) => s.id === subA.id.toString()
      );
      const returnedB = body.subcategories.find(
        (s) => s.id === subB.id.toString()
      );
      expect(returnedA!.position).toBe(2);
      expect(returnedB!.position).toBe(1);

      const [dbSubA, dbSubB] = await Promise.all([
        prisma.subcategory.findUnique({ where: { id: subA.id } }),
        prisma.subcategory.findUnique({ where: { id: subB.id } }),
      ]);
      expect(dbSubA!.position).toBe(2);
      expect(dbSubB!.position).toBe(1);
    });

    it("should reorder the list returned by GET /subcategories", async () => {
      const { methodology, subcategories } =
        await createCategoryWithSubcategories("Test - Swap Reorders List", 3);
      const [subA, subB] = subcategories;

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodology.id}`,
      });

      const body = JSON.parse(response.body) as GetAllSubcategoriesResponse;
      expect(body.map((s) => s.id)).toEqual([
        subB.id.toString(),
        subA.id.toString(),
        subcategories[2].id.toString(),
      ]);
    });

    it("should leave the other subcategories of the category untouched", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap No Side Effects",
        3
      );
      const [subA, subB, subC] = subcategories;

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const dbSubC = await prisma.subcategory.findUnique({
        where: { id: subC.id },
      });
      expect(dbSubC!.position).toBe(3);
    });

    it("should swap non-adjacent positions", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap Non Adjacent",
        3
      );
      const [subA, , subC] = subcategories;

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subC.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const [dbSubA, dbSubC] = await Promise.all([
        prisma.subcategory.findUnique({ where: { id: subA.id } }),
        prisma.subcategory.findUnique({ where: { id: subC.id } }),
      ]);
      expect(dbSubA!.position).toBe(3);
      expect(dbSubC!.position).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when a subcategory does not exist", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap Missing",
        1
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subcategories[0].id.toString(),
          subcategoryIdB: "999999999",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when a subcategory is deleted", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap Deleted",
        2
      );
      const [subA, subB] = subcategories;
      await prisma.subcategory.update({
        where: { id: subB.id },
        data: { status: SubcategoryStatus.DELETED },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 422 when both IDs are the same", async () => {
      const { subcategories } = await createCategoryWithSubcategories(
        "Test - Swap Same Id",
        1
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subcategories[0].id.toString(),
          subcategoryIdB: subcategories[0].id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SAME_SUBCATEGORY");
    });

    it("should return 422 when the subcategories belong to different categories", async () => {
      const { methodology, subcategories } =
        await createCategoryWithSubcategories("Test - Swap Cross Category", 1);
      const otherCategory = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Cross Category Other",
        position: 2,
      });
      const otherSubcategory = await createTestSubcategory(
        prisma,
        otherCategory.id,
        { name: "Test - Swap Cross Category Sub" }
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subcategories[0].id.toString(),
          subcategoryIdB: otherSubcategory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORIES_FROM_DIFFERENT_CATEGORIES");
    });
  });
});
