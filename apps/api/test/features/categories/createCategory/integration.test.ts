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
      // First category of an empty methodology version.
      expect(body.position).toBe(1);
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
      expect(dbRecord!.position).toBe(1);
      expect(dbRecord!.status).toBe(CategoryStatus.ACTIVE);
    });

    it("should append the new category last inside its methodology version", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Category Position",
      });
      await createTestCategory(prisma, methodology.id, {
        name: "Test - Existing Position Category",
        position: 1,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/categories/",
        payload: buildCategoryPayload(methodology.id.toString()),
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCategoryResponse;

      const dbRecord = await prisma.category.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(dbRecord!.position).toBe(2);
    });

    it("should wait for a concurrent create in the same methodology version", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Category Concurrent Position",
      });
      await createTestCategory(prisma, methodology.id, {
        name: "Test - Concurrent Existing Category",
        position: 1,
      });

      // Reproduces the race the methodology version lock exists for: a
      // transaction holds position 2 uncommitted while the request computes its
      // own. With the lock the request blocks, then reads MAX(position) = 2 and
      // appends 3. Without it, it computes 2 as well and the partial unique
      // index rejects it with a 409 about a position the client never supplied.
      // Mirrors the same test on createSubcategory.
      let releaseHolder: () => void = () => undefined;
      const holderReleased = new Promise<void>((resolve) => {
        releaseHolder = resolve;
      });
      let holderLocked: () => void = () => undefined;
      const holderHasLock = new Promise<void>((resolve) => {
        holderLocked = resolve;
      });

      const holder = prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "methodology_version" WHERE "id" = ${methodology.id} FOR UPDATE`;
          await tx.category.create({
            data: {
              methodologyVersionId: methodology.id,
              name: "Test - Concurrent Holder Category",
              icon: "FACTORY",
              color: "#000000",
              synonyms: "test",
              description: "Holds position 2 until the request is in flight",
              position: 2,
              status: CategoryStatus.ACTIVE,
            },
          });
          holderLocked();
          await holderReleased;
        },
        { timeout: 20000 }
      );

      // The request must not start until the holder owns the lock and has taken
      // position 2. Starting both and hoping the holder wins makes the
      // interleaving a race: if the request got there first it would take
      // position 2 itself and the holder's insert would be the one rejected.
      await holderHasLock;

      const requestPromise = app.inject({
        method: "POST",
        url: "/api/categories/",
        payload: buildCategoryPayload(methodology.id.toString()),
      });

      // Only to let the request reach the lock and block on it, so the test
      // exercises the waiting path rather than a sequential one.
      await new Promise((resolve) => setTimeout(resolve, 300));
      releaseHolder();
      await holder;

      const response = await requestPromise;

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCategoryResponse;
      expect(body.position).toBe(3);
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

    it("should return 400 when a position is sent", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Rejected Position",
      });

      // The server assigns the position, so the schema is strict about it: a
      // client that keeps sending one is out of date, and silently ignoring it
      // would leave the row somewhere the caller did not ask for.
      const payload = buildCategoryPayload(methodology.id.toString(), {
        position: 1,
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
  });
});
