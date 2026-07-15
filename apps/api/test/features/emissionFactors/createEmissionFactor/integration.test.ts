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

    it("should create with a pre-configured dimensionValue2Name", async () => {
      const { payload, subcategory } = await buildEmissionFactorPayload({
        dimensionValue2Name: "Vacuno",
        source: "IPCC dim2",
      });

      // Pre-configure a dimension at position 2
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Vacuno",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateEmissionFactorResponse;

      expect(body.dimensionValue2Name).toBe("Vacuno");
      expect(body.dimensionValue2Id).toBeTruthy();
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

    it("should return 404 when the dimension is configured but the value name does not exist", async () => {
      const { payload, subcategory } = await buildEmissionFactorPayload({
        dimensionValue1Name: "GhostValue",
        source: "IPCC dim value not found",
      });

      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "RealValue",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_VALUE_NOT_FOUND");
    });
  });

  describe("Gas details validation", () => {
    it("should return 400 when gasDetails sum does not match the declared value", async () => {
      const { payload } = await buildEmissionFactorPayload({
        source: "IPCC gas mismatch",
        value: 10,
        gasDetails: {
          CO2_FOSSIL: 1,
          CH4: 0,
          N2O: 0,
          HFC: 0,
          PFC: 0,
          SF6: 0,
          NF3: 0,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EMISSION_FACTOR_GAS_DETAILS_MISMATCH");
    });
  });

  describe("Duplicate detection", () => {
    it("should return 409 when a required-dimension combination already has an active factor", async () => {
      const { payload, subcategory } = await buildEmissionFactorPayload({
        source: "IPCC dup required",
        dimensionValue1Name: "A",
        dimensionValue2Name: "X",
      });

      const dim1 = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: true }
      );
      await createTestEmissionFactorDimensionValue(prisma, dim1.id, {
        value: "A",
      });
      await createTestEmissionFactorDimensionValue(prisma, dim1.id, {
        value: "B",
      });
      const dim2 = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: true }
      );
      await createTestEmissionFactorDimensionValue(prisma, dim2.id, {
        value: "X",
      });
      await createTestEmissionFactorDimensionValue(prisma, dim2.id, {
        value: "Y",
      });

      // First creation succeeds (dim1=A, dim2=X)
      const first = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });
      expect(first.statusCode).toBe(201);

      // Second creation with the exact same dim1/dim2 combination should conflict
      const second = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(second.statusCode).toBe(409);
      const body = JSON.parse(second.body) as { code: string };
      expect(body.code).toBe("EMISSION_FACTOR_DUPLICATE");
    });

    it("should return 409 when both required dimensions are left null on two active factors", async () => {
      const { payload, subcategory } = await buildEmissionFactorPayload({
        source: "IPCC dup null dims",
        dimensionValue1Name: null,
        dimensionValue2Name: null,
      });

      const dim1 = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: true }
      );
      await createTestEmissionFactorDimensionValue(prisma, dim1.id, {
        value: "A",
      });
      const dim2 = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: true }
      );
      await createTestEmissionFactorDimensionValue(prisma, dim2.id, {
        value: "X",
      });

      // First creation succeeds with both dims left null
      const first = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });
      expect(first.statusCode).toBe(201);

      // Second creation, also leaving both dims null, should conflict
      const second = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(second.statusCode).toBe(409);
      const body = JSON.parse(second.body) as { code: string };
      expect(body.code).toBe("EMISSION_FACTOR_DUPLICATE");
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

    it("should return 404 when rateMeasurementUnitId does not exist (FK violation)", async () => {
      const { payload } = await buildEmissionFactorPayload({
        source: "IPCC bad rate unit",
        rateMeasurementUnitId: "999999999",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors/",
        payload,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("RATE_MEASUREMENT_UNIT_NOT_FOUND");
    });
  });
});
