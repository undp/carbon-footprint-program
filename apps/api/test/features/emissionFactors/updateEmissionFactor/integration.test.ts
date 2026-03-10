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
import type { UpdateEmissionFactorResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("PATCH /api/emission-factors/:id - Integration Tests", () => {
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

  it("should update the emission factor value and return 200", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Update EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Update Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Update Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    const ef = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { value: "1.5", source: "Test Update Source" }
    );

    const response = await app.inject({
      method: "PATCH",
      url: `/api/emission-factors/${ef.id.toString()}`,
      payload: { value: 2.75 },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
    expect(body.value).toBe(2.75);
  });

  it("should update the source field", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Update Source EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Update Source Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Update Source Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    const ef = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { source: "Old Source" }
    );

    const response = await app.inject({
      method: "PATCH",
      url: `/api/emission-factors/${ef.id.toString()}`,
      payload: { source: "IPCC 2024" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
    expect(body.source).toBe("IPCC 2024");
  });

  it("should return 404 when emission factor does not exist", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/emission-factors/999999",
      payload: { value: 2.0 },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("EMISSION_FACTOR_NOT_FOUND");
  });
});
