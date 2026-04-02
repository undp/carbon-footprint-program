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
import { EmissionFactorStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("DELETE /api/emission-factors/:id - Integration Tests", () => {
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

  it("should soft-delete an emission factor and return 200", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Delete EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Delete Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Delete Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    const ef = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/api/emission-factors/${ef.id.toString()}`,
    });

    expect(response.statusCode).toBe(200);

    // Verify soft delete
    const dbRecord = await prisma.emissionFactor.findUnique({
      where: { id: ef.id },
    });

    expect(dbRecord).toBeDefined();
    expect(dbRecord!.status).toBe(EmissionFactorStatus.DELETED);
  });

  it("should return 404 when emission factor does not exist", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/emission-factors/999999",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("EMISSION_FACTOR_NOT_FOUND");
  });

  it("should return 404 when trying to delete an already deleted emission factor", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Double Delete EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Double Delete Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Double Delete Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    const ef = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { status: EmissionFactorStatus.DELETED }
    );

    const response = await app.inject({
      method: "DELETE",
      url: `/api/emission-factors/${ef.id.toString()}`,
    });

    expect(response.statusCode).toBe(404);
  });
});
