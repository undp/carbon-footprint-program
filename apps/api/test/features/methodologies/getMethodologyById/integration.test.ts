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
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import type { GetMethodologyByIdResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  CategoryStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";

describe("GET /api/methodologies/:id - Integration Tests", () => {
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

  it("should return the methodology with categories ordered by position and subcategories ordered by name", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.PUBLISHED,
    });

    const categoryB = await createTestCategory(prisma, methodology.id, {
      name: "Test - Category B",
      position: 2,
    });
    const categoryA = await createTestCategory(prisma, methodology.id, {
      name: "Test - Category A",
      position: 1,
    });

    await createTestSubcategory(prisma, categoryA.id, {
      name: "Test - Subcategory Z",
    });
    await createTestSubcategory(prisma, categoryA.id, {
      name: "Test - Subcategory A",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMethodologyByIdResponse;

    expect(body.id).toBe(methodology.id.toString());
    expect(body.name).toBe(methodology.name);
    expect(body.status).toBe(MethodologyVersionStatus.PUBLISHED);

    expect(body.categories).toHaveLength(2);
    expect(body.categories[0].id).toBe(categoryA.id.toString());
    expect(body.categories[1].id).toBe(categoryB.id.toString());

    expect(body.categories[0].subcategories.map((s) => s.name)).toEqual([
      "Test - Subcategory A",
      "Test - Subcategory Z",
    ]);
    expect(body.categories[1].subcategories).toEqual([]);
  });

  it("should exclude DELETED categories and DELETED subcategories", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma);

    const activeCategory = await createTestCategory(prisma, methodology.id, {
      name: "Test - Active Category",
      position: 1,
    });
    await createTestCategory(prisma, methodology.id, {
      name: "Test - Deleted Category",
      position: 2,
      status: CategoryStatus.DELETED,
    });

    await createTestSubcategory(prisma, activeCategory.id, {
      name: "Test - Active Subcategory",
    });
    await createTestSubcategory(prisma, activeCategory.id, {
      name: "Test - Deleted Subcategory",
      status: SubcategoryStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMethodologyByIdResponse;

    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].id).toBe(activeCategory.id.toString());
    expect(body.categories[0].subcategories).toHaveLength(1);
    expect(body.categories[0].subcategories[0].name).toBe(
      "Test - Active Subcategory"
    );
  });

  it("should return 404 when the methodology does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/methodologies/999999999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
  });

  it("should return 404 when the methodology is DELETED", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
  });

  it("should return UNPUBLISHED methodologies", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.UNPUBLISHED,
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMethodologyByIdResponse;
    expect(body.status).toBe(MethodologyVersionStatus.UNPUBLISHED);
  });
});
