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
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import type { DuplicateMethodologyResponse } from "@repo/types";
import { CategoryStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/methodologies/:id/duplicate - Integration Tests", () => {
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
    await restoreMethodologies(prisma);
  });

  describe("Successful duplication", () => {
    it("should duplicate a methodology and return 201", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Original",
        description: "Original description",
        regulation: "Original Regulation",
        version: "1.0",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.id).toBeTruthy();
      expect(body.id).not.toBe(original.id.toString());
      expect(body.name).toContain("(1)");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should copy all fields from the original except status and name", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Fields",
        description: "Should be copied",
        regulation: "Should be copied too",
        version: "5.0",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.description).toBe("Should be copied");
      expect(body.regulation).toBe("Should be copied too");
      expect(body.version).toBe("5.0");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should persist the duplicated methodology in the database", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - DB Verify Duplicate",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.UNPUBLISHED);
    });

    it("should increment numeric suffix if name with (1) already exists", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Naming",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      // First duplicate
      const firstDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(firstDuplicateResponse.statusCode).toBe(201);

      // Second duplicate - should get "(2)"
      const secondDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(secondDuplicateResponse.statusCode).toBe(201);

      const secondBody = JSON.parse(
        secondDuplicateResponse.body
      ) as DuplicateMethodologyResponse;

      expect(secondBody.name).toBe(`${original.name} (2)`);
    });

    it("should duplicate active categories from original methodology", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate With Categories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createTestCategory(prisma, original.id, {
        name: "Test - Category A",
        icon: "icon-a",
        color: "#AA0000",
        synonyms: "a-syn",
        description: "Category A description",
        position: 1,
      });
      await createTestCategory(prisma, original.id, {
        name: "Test - Category B",
        icon: "icon-b",
        color: "#BB0000",
        synonyms: "b-syn",
        description: "Category B description",
        position: 2,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: {
          methodologyVersionId: BigInt(body.id),
          status: CategoryStatus.ACTIVE,
        },
        orderBy: { position: "asc" },
      });

      expect(duplicatedCategories).toHaveLength(2);
      expect(duplicatedCategories[0].name).toBe("Test - Category A");
      expect(duplicatedCategories[0].icon).toBe("icon-a");
      expect(duplicatedCategories[0].color).toBe("#AA0000");
      expect(duplicatedCategories[0].position).toBe(1);
      expect(duplicatedCategories[1].name).toBe("Test - Category B");
      expect(duplicatedCategories[1].icon).toBe("icon-b");
      expect(duplicatedCategories[1].color).toBe("#BB0000");
      expect(duplicatedCategories[1].position).toBe(2);
    });

    it("should not duplicate deleted categories", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Duplicate Skip Deleted",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createTestCategory(prisma, original.id, {
        name: "Test - Active Category",
        position: 1,
      });
      await createTestCategory(prisma, original.id, {
        name: "Test - Deleted Category",
        position: 2,
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const duplicatedCategories = await prisma.category.findMany({
        where: { methodologyVersionId: BigInt(body.id) },
      });

      expect(duplicatedCategories).toHaveLength(1);
      expect(duplicatedCategories[0].name).toBe("Test - Active Category");
      expect(duplicatedCategories[0].status).toBe(CategoryStatus.ACTIVE);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const maxId =
        (await prisma.methodologyVersion.aggregate({ _max: { id: true } }))._max
          .id ?? 0n;
      const nonExistentId = maxId + 1n;

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${nonExistentId}/duplicate`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });
  });
});
