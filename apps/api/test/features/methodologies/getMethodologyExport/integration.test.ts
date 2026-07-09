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
import {
  createTestEmissionFactor,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import {
  GetMethodologyExportResponseSchema,
  type GetMethodologyExportResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  CategoryStatus,
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
  type PrismaClient,
} from "@repo/database";

describe("GET /api/methodologies/:id/export - Integration Tests", () => {
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

  it("returns the full methodology hierarchy with dimensions, values, and emission factors", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.PUBLISHED,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Energía",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Electricidad",
    });

    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { name: "Test - Región", position: 1, isRequired: true }
    );
    const dimensionValue = await createTestEmissionFactorDimensionValue(
      prisma,
      dimension.id,
      { value: "Test - Norte" }
    );

    const rateMeasurementUnitId = await getTestRateMeasurementUnitId(prisma);
    const factor = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateMeasurementUnitId,
      {
        dimensionValue1Id: dimensionValue.id,
        source: "Test - Source",
        value: "0.42",
        gasDetails: {
          CO2_FOSSIL: 1,
          CH4: 0,
          N2O: 0,
          HFC: 0,
          PFC: 0,
          SF6: 0,
          NF3: 0,
        },
      }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}/export`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMethodologyExportResponse;

    expect(() => GetMethodologyExportResponseSchema.parse(body)).not.toThrow();

    expect(body.id).toBe(methodology.id.toString());
    expect(body.categories).toHaveLength(1);
    const [respCategory] = body.categories;
    expect(respCategory.id).toBe(category.id.toString());

    expect(respCategory.subcategories).toHaveLength(1);
    const [respSubcategory] = respCategory.subcategories;
    expect(respSubcategory.id).toBe(subcategory.id.toString());

    expect(respSubcategory.dimensions).toHaveLength(1);
    const [respDimension] = respSubcategory.dimensions;
    expect(respDimension.id).toBe(dimension.id.toString());
    expect(respDimension.values).toHaveLength(1);
    expect(respDimension.values[0].id).toBe(dimensionValue.id.toString());

    expect(respSubcategory.emissionFactors).toHaveLength(1);
    const [respFactor] = respSubcategory.emissionFactors;
    expect(respFactor.id).toBe(factor.id.toString());
    expect(respFactor.dimensionValue1?.value).toBe("Test - Norte");
    expect(respFactor.dimensionValue2).toBeNull();
    expect(respFactor.gasDetails.CO2_FOSSIL).toBe(1);
    expect(respFactor.value).toBe("0.42");
  });

  it("excludes DELETED categories, subcategories, dimensions, values, and emission factors", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma);
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Activa",
      position: 1,
    });
    await createTestCategory(prisma, methodology.id, {
      name: "Test - Eliminada",
      position: 2,
      status: CategoryStatus.DELETED,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Activa",
    });
    await createTestSubcategory(prisma, category.id, {
      name: "Test - Eliminada",
      status: SubcategoryStatus.DELETED,
    });

    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { name: "Test - Activa", position: 1 }
    );
    await createTestEmissionFactorDimension(prisma, subcategory.id, {
      name: "Test - Eliminada",
      position: 2,
      status: EmissionFactorDimensionStatus.DELETED,
    });

    await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
      value: "Test - Activo",
    });
    await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
      value: "Test - Eliminado",
      status: EmissionFactorDimensionValueStatus.DELETED,
    });

    const rateMeasurementUnitId = await getTestRateMeasurementUnitId(prisma);
    await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateMeasurementUnitId,
      { source: "Test - Activo" }
    );
    await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateMeasurementUnitId,
      { source: "Test - Eliminado", status: EmissionFactorStatus.DELETED }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}/export`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetMethodologyExportResponse;

    expect(body.categories).toHaveLength(1);
    expect(body.categories[0].subcategories).toHaveLength(1);
    const [respSubcategory] = body.categories[0].subcategories;
    expect(respSubcategory.dimensions).toHaveLength(1);
    expect(respSubcategory.dimensions[0].values).toHaveLength(1);
    expect(respSubcategory.emissionFactors).toHaveLength(1);
  });

  it("returns 404 when the methodology does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/methodologies/999999999/export",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when the methodology is DELETED", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      status: MethodologyVersionStatus.DELETED,
    });
    const response = await app.inject({
      method: "GET",
      url: `/api/methodologies/${methodology.id.toString()}/export`,
    });
    expect(response.statusCode).toBe(404);
  });
});
