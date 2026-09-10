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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { SwapSubcategoryPositionsResponse } from "@repo/types";
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

  /** A methodology with one category, ready to hold subcategories. */
  const createCategory = async (nameTag: string) => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${nameTag}`,
      status: MethodologyVersionStatus.PUBLISHED,
    });
    return createTestCategory(prisma, methodology.id, {
      name: `Test - ${nameTag} Category`,
      position: 1,
    });
  };

  describe("Successful swap", () => {
    it("should swap positions of two subcategories and return 201", async () => {
      const category = await createCategory("Swap Subcategory Positions");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub B",
        position: 2,
      });

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
      expect(body.subcategories).toHaveLength(2);

      const returnedA = body.subcategories.find(
        (s) => s.id === subA.id.toString()
      );
      const returnedB = body.subcategories.find(
        (s) => s.id === subB.id.toString()
      );

      expect(returnedA!.position).toBe(2);
      expect(returnedB!.position).toBe(1);
      expect(returnedA!.status).toBe(SubcategoryStatus.ACTIVE);
      expect(returnedB!.status).toBe(SubcategoryStatus.ACTIVE);
    });

    it("should persist the swapped positions in the database", async () => {
      const category = await createCategory("Swap Sub Persist");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Persist A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Persist B",
        position: 3,
      });

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const [dbSubA, dbSubB] = await Promise.all([
        prisma.subcategory.findUniqueOrThrow({ where: { id: subA.id } }),
        prisma.subcategory.findUniqueOrThrow({ where: { id: subB.id } }),
      ]);

      expect(dbSubA.position).toBe(3);
      expect(dbSubB.position).toBe(1);
    });

    it("should stamp the acting user on both swapped subcategories", async () => {
      const user = await getTestLoggedUser(prisma);
      const category = await createCategory("Swap Sub Audit");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Audit A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Audit B",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);

      const [dbSubA, dbSubB] = await Promise.all([
        prisma.subcategory.findUniqueOrThrow({ where: { id: subA.id } }),
        prisma.subcategory.findUniqueOrThrow({ where: { id: subB.id } }),
      ]);

      // updatedAt is bumped by Prisma on any write; without the actor next to
      // it the row claims it was last touched by whoever edited it before.
      expect(dbSubA.updatedById).toBe(user.id);
      expect(dbSubB.updatedById).toBe(user.id);
      expect(dbSubA.updatedAt).not.toBeNull();
      expect(dbSubB.updatedAt).not.toBeNull();
    });

    it("should reorder the listing the maintainer screen reads", async () => {
      const category = await createCategory("Swap Sub Listing");
      const methodologyVersionId = category.methodologyVersionId;
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Listing A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Listing B",
        position: 2,
      });

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const listing = await app.inject({
        method: "GET",
        url: `/api/subcategories/?methodologyVersionId=${methodologyVersionId.toString()}`,
      });

      expect(listing.statusCode).toBe(200);
      const rows = JSON.parse(listing.body) as { id: string }[];
      expect(rows.map((row) => row.id)).toEqual([
        subB.id.toString(),
        subA.id.toString(),
      ]);
    });

    it("should not affect other subcategories in the same category", async () => {
      const category = await createCategory("Swap Sub Side Effects");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Side A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Side B",
        position: 2,
      });
      const subC = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Side C",
        position: 3,
      });

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const dbSubC = await prisma.subcategory.findUniqueOrThrow({
        where: { id: subC.id },
      });
      expect(dbSubC.position).toBe(3);
    });

    it("should leave room for a create that follows the swap", async () => {
      // The swap parks a row at MAX + 1 mid-transaction. Once it commits, the
      // next create must still land on MAX + 1 rather than collide.
      const category = await createCategory("Swap Sub Then Create");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Then Create A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Then Create B",
        position: 2,
      });

      await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      const created = await app.inject({
        method: "POST",
        url: "/api/subcategories/",
        payload: {
          categoryId: category.id.toString(),
          name: "Test - Swap Then Create C",
          icon: "FACTORY",
          description: "Created right after a swap",
          measurementUnitIds: [],
        },
      });

      expect(created.statusCode).toBe(201);
      const body = JSON.parse(created.body) as { position: number };
      expect(body.position).toBe(3);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when subcategoryIdA does not exist", async () => {
      const category = await createCategory("Swap Sub 404 A");
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub 404 B",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: "999999999",
          subcategoryIdB: subB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when subcategoryIdB does not exist", async () => {
      const category = await createCategory("Swap Sub 404 B");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub 404 A",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: "999999999",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when one of the subcategories is soft-deleted", async () => {
      const category = await createCategory("Swap Sub Deleted");
      const subA = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Del A",
        position: 1,
        status: SubcategoryStatus.DELETED,
      });
      const subB = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Del B",
        position: 2,
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
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 422 when both subcategory IDs are the same", async () => {
      const category = await createCategory("Swap Sub Same ID");
      const subcategory = await createTestSubcategory(prisma, category.id, {
        name: "Test - Swap Sub Same",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subcategory.id.toString(),
          subcategoryIdB: subcategory.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SAME_SUBCATEGORY");
    });

    it("should return 422 when the subcategories belong to different categories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Swap Sub Different Categories",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const categoryA = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Sub Diff Cat A",
        position: 1,
      });
      const categoryB = await createTestCategory(prisma, methodology.id, {
        name: "Test - Swap Sub Diff Cat B",
        position: 2,
      });

      const subA = await createTestSubcategory(prisma, categoryA.id, {
        name: "Test - Swap Sub Diff A",
        position: 1,
      });
      const subB = await createTestSubcategory(prisma, categoryB.id, {
        name: "Test - Swap Sub Diff B",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {
          subcategoryIdA: subA.id.toString(),
          subcategoryIdB: subB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORIES_FROM_DIFFERENT_CATEGORIES");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when subcategoryIdA is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: { subcategoryIdB: "1" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when subcategoryIdB is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/subcategories/swap-positions",
        payload: { subcategoryIdA: "1" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
