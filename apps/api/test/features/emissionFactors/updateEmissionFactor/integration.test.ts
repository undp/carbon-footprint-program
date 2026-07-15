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
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
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
    expect(body.value).toBe("2.75");
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

  it("should reject source update when another active factor in the same subcategory has a different source", async () => {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Source Conflict EF",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Source Conflict Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Source Conflict Subcategory",
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);

    await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
      source: "Source A",
    });

    const efToUpdate = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { source: "Source A" }
    );

    const response = await app.inject({
      method: "PATCH",
      url: `/api/emission-factors/${efToUpdate.id.toString()}`,
      payload: { source: "Source B" },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("EMISSION_FACTOR_SOURCE_CONFLICT");
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

  async function buildBaseSubcategory(namePrefix: string) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - ${namePrefix}`,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: `Test - ${namePrefix} Category`,
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: `Test - ${namePrefix} Subcategory`,
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);
    return { methodology, category, subcategory, rateUnitId };
  }

  describe("Field-by-field updates", () => {
    it("should update rateMeasurementUnitId to a different valid unit", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("RMU Update");
      const otherUnits = await prisma.rateMeasurementUnit.findMany({
        where: { id: { not: rateUnitId } },
        take: 1,
        select: { id: true },
      });
      if (otherUnits.length === 0) {
        throw new Error(
          "Test precondition failed: need at least 2 seeded rate measurement units."
        );
      }
      const otherUnitId = otherUnits[0].id;

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test RMU Source" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { rateMeasurementUnitId: otherUnitId.toString() },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.rateMeasurementUnitId).toBe(otherUnitId.toString());
    });

    it("should update gasDetails only, falling back to the existing value for the sum check", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("GasDetails Only");

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        {
          source: "Test GasDetails Only Source",
          value: "2",
          gasDetails: {
            CO2_FOSSIL: 2,
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
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
          gasDetails: {
            CO2_FOSSIL: 1.5,
            CH4: 0.5,
            N2O: 0,
            HFC: 0,
            PFC: 0,
            SF6: 0,
            NF3: 0,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.gasDetails.CO2_FOSSIL).toBe(1.5);
      expect(body.value).toBe("2");
    });

    it("should clear dimensionValue1Name by setting it to null", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("Clear Dim1");
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      const value = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "Initial Dim1" }
      );
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Clear Dim1 Source", dimensionValue1Id: value.id }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { dimensionValue1Name: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.dimensionValue1Id).toBeNull();
      expect(body.dimensionValue1Name).toBeNull();
    });

    it("should update dimensionValue1Name to a real value without changing subcategory", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("Set Dim1");
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "New Dim1 Value",
      });
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Set Dim1 Source" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { dimensionValue1Name: "New Dim1 Value" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.dimensionValue1Name).toBe("New Dim1 Value");
    });

    it("should clear dimensionValue2Name by setting it to null", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("Clear Dim2");
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: false }
      );
      const value = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "Initial Dim2" }
      );
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Clear Dim2 Source", dimensionValue2Id: value.id }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { dimensionValue2Name: null },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.dimensionValue2Id).toBeNull();
      expect(body.dimensionValue2Name).toBeNull();
    });

    it("should update dimensionValue2Name to a real value without changing subcategory", async () => {
      const { subcategory, rateUnitId } =
        await buildBaseSubcategory("Set Dim2");
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: false }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "New Dim2 Value",
      });
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Set Dim2 Source" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { dimensionValue2Name: "New Dim2 Value" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.dimensionValue2Name).toBe("New Dim2 Value");
    });

    it("should accept a redundant subcategoryId (same as existing) alongside another field change", async () => {
      const { subcategory, rateUnitId } = await buildBaseSubcategory(
        "Redundant Subcategory"
      );

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Redundant Subcategory Source", value: "3" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
          subcategoryId: subcategory.id.toString(),
          value: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.subcategoryId).toBe(subcategory.id.toString());
      expect(body.value).toBe("5");
    });
  });

  describe("Gas details validation", () => {
    it("should return 400 when updated gasDetails sum does not match the value", async () => {
      const { subcategory, rateUnitId } = await buildBaseSubcategory(
        "Gas Mismatch Update"
      );

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Gas Mismatch Source", value: "1.5" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
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
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EMISSION_FACTOR_GAS_DETAILS_MISMATCH");
    });
  });

  describe("Subcategory change", () => {
    it("should return 400 when changing subcategory without providing both dimension names", async () => {
      const { subcategory: source, rateUnitId } = await buildBaseSubcategory(
        "Subcategory Change Missing Dims Source"
      );
      const { subcategory: target } = await buildBaseSubcategory(
        "Subcategory Change Missing Dims Target"
      );

      const ef = await createTestEmissionFactor(prisma, source.id, rateUnitId, {
        source: "Test Missing Dims Source",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { subcategoryId: target.id.toString() },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_CHANGE_MISSING_DIMENSIONS");
    });

    it("should return 400 when changing subcategory with only dimensionValue1Name provided", async () => {
      const { subcategory: source, rateUnitId } = await buildBaseSubcategory(
        "Subcategory Change Partial Dims Source"
      );
      const { subcategory: target } = await buildBaseSubcategory(
        "Subcategory Change Partial Dims Target"
      );

      const ef = await createTestEmissionFactor(prisma, source.id, rateUnitId, {
        source: "Test Partial Dims Source",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
          subcategoryId: target.id.toString(),
          dimensionValue1Name: null,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SUBCATEGORY_CHANGE_MISSING_DIMENSIONS");
    });

    it("should change subcategory when both dimension names are explicitly set to null", async () => {
      const { subcategory: source, rateUnitId } = await buildBaseSubcategory(
        "Subcategory Change Null Dims Source"
      );
      const { subcategory: target } = await buildBaseSubcategory(
        "Subcategory Change Null Dims Target"
      );

      const ef = await createTestEmissionFactor(prisma, source.id, rateUnitId, {
        source: "Test Null Dims Source",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
          subcategoryId: target.id.toString(),
          dimensionValue1Name: null,
          dimensionValue2Name: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.subcategoryId).toBe(target.id.toString());
      expect(body.dimensionValue1Id).toBeNull();
      expect(body.dimensionValue2Id).toBeNull();
    });

    it("should change subcategory and resolve real dimension values in the target subcategory", async () => {
      const { subcategory: source, rateUnitId } = await buildBaseSubcategory(
        "Subcategory Change Real Dims Source"
      );
      const { subcategory: target } = await buildBaseSubcategory(
        "Subcategory Change Real Dims Target"
      );

      const dim1 = await createTestEmissionFactorDimension(prisma, target.id, {
        position: 1,
        isRequired: false,
      });
      await createTestEmissionFactorDimensionValue(prisma, dim1.id, {
        value: "Target Dim1",
      });
      const dim2 = await createTestEmissionFactorDimension(prisma, target.id, {
        position: 2,
        isRequired: false,
      });
      await createTestEmissionFactorDimensionValue(prisma, dim2.id, {
        value: "Target Dim2",
      });

      const ef = await createTestEmissionFactor(prisma, source.id, rateUnitId, {
        source: "Test Real Dims Source",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: {
          subcategoryId: target.id.toString(),
          dimensionValue1Name: "Target Dim1",
          dimensionValue2Name: "Target Dim2",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateEmissionFactorResponse;
      expect(body.subcategoryId).toBe(target.id.toString());
      expect(body.dimensionValue1Name).toBe("Target Dim1");
      expect(body.dimensionValue2Name).toBe("Target Dim2");
    });
  });

  describe("Duplicate detection", () => {
    it("should return 409 when updating dimensionValue1Name creates a duplicate with another active factor", async () => {
      const { subcategory, rateUnitId } = await buildBaseSubcategory(
        "Update Duplicate Detection"
      );
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: true }
      );
      const valueA = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "A" }
      );
      const valueB = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension.id,
        { value: "B" }
      );

      await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {
        source: "Test Update Duplicate Source",
        dimensionValue1Id: valueA.id,
      });
      const efB = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        {
          source: "Test Update Duplicate Source",
          dimensionValue1Id: valueB.id,
        }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${efB.id.toString()}`,
        payload: { dimensionValue1Name: "A" },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("EMISSION_FACTOR_DUPLICATE");
    });
  });

  describe("Reference validation", () => {
    it("should return 404 when updated rateMeasurementUnitId does not exist (FK violation)", async () => {
      const { subcategory, rateUnitId } = await buildBaseSubcategory(
        "Update Invalid Rate Unit"
      );
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { source: "Test Invalid Rate Unit Source" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${ef.id.toString()}`,
        payload: { rateMeasurementUnitId: "999999999" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("RATE_MEASUREMENT_UNIT_NOT_FOUND");
    });
  });
});
