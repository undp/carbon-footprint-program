import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { updateCategoryService } from "@/features/categories/updateCategory/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";
import type { UpdateCategoryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { CategoryStatus } from "@repo/types";

describe("PATCH /api/categories/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;

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

  beforeEach(async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Update Category Methodology",
      status: MethodologyVersionStatus.UNPUBLISHED,
    });
    methodologyVersionId = methodology.id;
  });

  describe("Successful update", () => {
    it("should update a single field and return 200", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Original Name",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          name: "Updated Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.name).toBe("Updated Name");
    });

    it("should update multiple fields at once", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Multi Update",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          name: "Updated Multi Name",
          icon: "TRUCK",
          color: "#FF0000",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.name).toBe("Updated Multi Name");
      expect(body.icon).toBe("TRUCK");
      expect(body.color).toBe("#FF0000");
    });

    it("should only update provided fields, leaving others unchanged", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Partial Update",
        icon: "FACTORY",
        color: "#00FF00",
        synonyms: "original-synonyms",
        description: "Original description",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          name: "Updated Partial Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.name).toBe("Updated Partial Name");
      expect(body.icon).toBe("FACTORY");
      expect(body.color).toBe("#00FF00");
      expect(body.synonyms).toBe("original-synonyms");
      expect(body.description).toBe("Original description");
    });

    it("should update position", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Update Position",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          position: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.position).toBe(5);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent category", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/categories/999999999",
        payload: {
          name: "Should Not Work",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 404 when category is deleted", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Deleted Category",
        position: 1,
        status: CategoryStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          name: "Should Not Work",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return 409 when updating to a duplicate name", async () => {
      await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Existing Name",
        position: 1,
      });

      const category2 = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - To Be Renamed",
        position: 2,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category2.id}`,
        payload: {
          name: "Test - Existing Name",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_NAME_ALREADY_EXISTS");
    });

    it("should return 400 when no fields are provided", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Empty Update",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 409 when updating to a duplicate position", async () => {
      await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Position One",
        position: 1,
      });

      const category2 = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Position Two",
        position: 2,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category2.id}`,
        payload: {
          position: 1,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("CATEGORY_POSITION_ALREADY_EXISTS");
    });
  });

  describe("Individual optional field updates", () => {
    it("should update synonyms only", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Synonyms Update",
        synonyms: "old-synonyms",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          synonyms: "new-synonyms",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.synonyms).toBe("new-synonyms");
    });

    it("should update description only", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Description Update",
        description: "old description",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          description: "new description",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.description).toBe("new description");
    });

    it("should update explanation only", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Explanation Update",
        position: 1,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/categories/${category.id}`,
        payload: {
          explanation: "new explanation",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCategoryResponse;
      expect(body.explanation).toBe("new explanation");
    });
  });

  describe("Direct service invocation (bypassing schema-level validation)", () => {
    // UpdateCategoryRequestSchema's `.refine` guarantees at least one field is
    // defined before the service is ever reached over HTTP, so the service's
    // own `Object.keys(updateData).length > 0` guard can never see an empty
    // object through app.inject(). Call the service directly to exercise the
    // false branch (no fields to update, updatedById left untouched).
    it("should leave the category unchanged when called with no fields set", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Direct Empty Update",
        position: 1,
      });
      const dbUser = await prisma.user.findFirstOrThrow();

      const result = await updateCategoryService(
        prisma,
        category.id.toString(),
        {},
        mapUserToResponse(dbUser)
      );

      expect(result.name).toBe("Test - Direct Empty Update");
      expect(result.updatedById).toBeNull();
    });

    // Every HTTP-facing route on this handler always has an authenticated
    // `currentUser` (the route requires auth), so `user` is never null in
    // practice. Call the service directly with `user = null` to exercise the
    // `user ? BigInt(user.id) : null` false branch.
    it("should set updatedById to null when no user is provided", async () => {
      const category = await createTestCategory(prisma, methodologyVersionId, {
        name: "Test - Direct No User Update",
        position: 1,
      });

      const result = await updateCategoryService(
        prisma,
        category.id.toString(),
        { name: "Direct No User Update - Renamed" },
        null
      );

      expect(result.name).toBe("Direct No User Update - Renamed");
      expect(result.updatedById).toBeNull();
    });
  });
});
