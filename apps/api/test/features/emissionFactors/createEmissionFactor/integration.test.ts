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
  getTestRateMeasurementUnitId,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
} from "@test/factories/emissionFactorFactory.js";
import type { CreateEmissionFactorResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/emission-factors/ - Integration Tests", () => {
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

  async function buildEmissionFactorPayload(
    overrides?: Record<string, unknown>
  ) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - For EF Creation",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - EF Parent Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - EF Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    return {
      payload: {
        subcategoryId: subcategory.id.toString(),
        dimensionValue1Name: null,
        dimensionValue2Name: null,
        rateMeasurementUnitId: rateUnitId.toString(),
        source: "DEFRA 2025",
        gasDetails: {
          CO2_FOSSIL: 1.5,
          CH4: 0,
          N2O: 0,
          HFC: 0,
          PFC: 0,
          SF6: 0,
          NF3: 0,
        },
        value: 1.5,
        ...overrides,
      },
      subcategory,
      rateUnitId,
    };
  }

  describe("Successful creation", () => {
    it("should create an emission factor and return 201", async () => {
      const { payload } = await buildEmissionFactorPayload();

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateEmissionFactorResponse;

      expect(body.id).toBeTruthy();
      expect(body.value).toBe("1.5");
      expect(body.source).toBe("DEFRA 2025");
      expect(body.subcategoryId).toBe(payload.subcategoryId);
      expect(body.gasDetails.CO2_FOSSIL).toBe(1.5);
    });

    it("should create with pre-configured dimension value names", async () => {
      const { payload, subcategory } = await buildEmissionFactorPayload({
        dimensionValue1Name: "Búfalos",
        source: "IPCC pre-configured",
      });

      // Pre-configure dimension and value
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Búfalos",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateEmissionFactorResponse;

      expect(body.dimensionValue1Name).toBe("Búfalos");
      expect(body.dimensionValue1Id).toBeTruthy();
    });

    it("should persist the emission factor in the database", async () => {
      const { payload } = await buildEmissionFactorPayload({
        source: "IPCC persist",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateEmissionFactorResponse;

      const dbRecord = await prisma.emissionFactor.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord!.source).toBe("IPCC persist");
    });
  });

  describe("Dimension validation", () => {
    it("should return 400 when dimension is not configured", async () => {
      const { payload } = await buildEmissionFactorPayload({
        dimensionValue1Name: "NonExistent",
        source: "IPCC no-dim",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_NOT_CONFIGURED");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload: {
          subcategoryId: "1",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Reference validation", () => {
    it("should return 404 when subcategory does not exist", async () => {
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload: {
          subcategoryId: "999999",
          dimensionValue1Name: null,
          dimensionValue2Name: null,
          rateMeasurementUnitId: rateUnitId.toString(),
          source: "DEFRA 2025",
          gasDetails: {
            CO2_FOSSIL: 0,
            CH4: 0,
            N2O: 0,
            HFC: 0,
            PFC: 0,
            SF6: 0,
            NF3: 0,
          },
          value: 1.0,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND_FOR_EMISSION_FACTOR");
    });
  });
});
