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
import type { GetAllCategoriesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { CategoryStatus } from "@repo/types";

describe("GET /api/categories/?methodologyVersionId=X - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testMethodologyId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up categories for test methodologies first
    const testMethodologies = await prisma.methodologyVersion.findMany({
      where: { name: { startsWith: "Test - " } },
      select: { id: true },
    });

    if (testMethodologies.length > 0) {
      const testMethodologyIds = testMethodologies.map((m) => m.id);

      await prisma.category.deleteMany({
        where: { methodologyVersionId: { in: testMethodologyIds } },
      });
    }

    // Then delete the test methodologies themselves
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful retrieval", () => {
    it("should return categories for a methodology version ordered by position", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Categories Ordered",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      testMethodologyId = methodology.id;

      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Category C",
        position: 3,
      });
      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Category A",
        position: 1,
      });
      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Category B",
        position: 2,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/categories/?methodologyVersionId=${testMethodologyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCategoriesResponse;

      expect(body).toHaveLength(3);
      expect(body[0].position).toBe(1);
      expect(body[1].position).toBe(2);
      expect(body[2].position).toBe(3);
    });

    it("should not return deleted categories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Categories With Deleted",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      testMethodologyId = methodology.id;

      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Active Category 1",
        position: 1,
        status: CategoryStatus.ACTIVE,
      });
      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Active Category 2",
        position: 2,
        status: CategoryStatus.ACTIVE,
      });
      await createTestCategory(prisma, testMethodologyId, {
        name: "Test - Deleted Category",
        position: 3,
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/categories/?methodologyVersionId=${testMethodologyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCategoriesResponse;

      expect(body).toHaveLength(2);
    });

    it("should return empty array when methodology has no categories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Empty Methodology",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      testMethodologyId = methodology.id;

      const response = await app.inject({
        method: "GET",
        url: `/api/categories/?methodologyVersionId=${testMethodologyId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCategoriesResponse;

      expect(body).toEqual([]);
    });
  });

  describe("Error handling", () => {
    it("should return 400 when methodologyVersionId is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/categories/",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
