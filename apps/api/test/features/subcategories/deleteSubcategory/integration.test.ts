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
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { SubcategoryStatus } from "@repo/types";

describe("DELETE /api/subcategories/:id - Integration Tests", () => {
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
    it("should soft-delete a subcategory and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Subcategory Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Delete Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Subcategory Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Verify Delete Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id);

      await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      const dbRecord = await prisma.subcategory.findUnique({
        where: { id: subcategory.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(SubcategoryStatus.DELETED);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when subcategory does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/subcategories/999999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("should return 404 when subcategory is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted Subcategory",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Already Deleted Parent",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id, {
        status: SubcategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/subcategories/${subcategory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });
  });
});
