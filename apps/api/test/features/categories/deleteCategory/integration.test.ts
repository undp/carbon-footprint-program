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
import type { DeleteCategoryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { CategoryStatus } from "@repo/types";

describe("DELETE /api/categories/:id - Integration Tests", () => {
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

  describe("Successful deletion", () => {
    it("should soft-delete a category and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Category Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeleteCategoryResponse;
      expect(body.message).toBe("Category deleted successfully");
      expect(body.id).toBe(category.id.toString());
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id);

      await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      const dbRecord = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(CategoryStatus.DELETED);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when category does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/categories/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 404 when category is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted Category",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const category = await createTestCategory(prisma, methodology.id, {
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/categories/${category.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });
  });
});
