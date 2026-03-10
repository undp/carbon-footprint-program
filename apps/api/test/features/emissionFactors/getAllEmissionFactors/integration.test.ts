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
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import type { GetAllEmissionFactorsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/emission-factors/ - Integration Tests", () => {
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

  it("should return emission factors filtered by methodologyVersionId", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - GetAll EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - GetAll Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - GetAll Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
      source: "Test Source GetAll",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/emission-factors/?methodologyVersionId=${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetAllEmissionFactorsResponse;

    expect(body.length).toBeGreaterThanOrEqual(1);
    const ef = body.find((e) => e.source === "Test Source GetAll");
    expect(ef).toBeDefined();
    expect(ef!.subcategoryName).toBe("Test - GetAll Subcategory");
  });

  it("should return empty array when no emission factors exist", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Empty EF",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/emission-factors/?methodologyVersionId=${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetAllEmissionFactorsResponse;
    expect(body).toEqual([]);
  });

  it("should not return soft-deleted emission factors", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Deleted EF Filter",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Deleted EF Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Deleted EF Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
      source: "Deleted EF Source",
      status: "DELETED",
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/emission-factors/?methodologyVersionId=${methodology.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetAllEmissionFactorsResponse;

    const deletedEf = body.find((e) => e.source === "Deleted EF Source");
    expect(deletedEf).toBeUndefined();
  });
});
