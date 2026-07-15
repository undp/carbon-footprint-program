import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { Prisma } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createCarbonInventory,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetEmissionFactorsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/emission-factors - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;
  let rateUnitId: bigint;
  let secondRateUnitId: bigint;

  // Subcategory with two ACTIVE dimensions (position 1 and 2, both required).
  let subcategoryBothDimsId: bigint;
  let selection1Id: bigint;
  let selection2Id: bigint;

  // Subcategory with a single ACTIVE dimension (position 1, required only).
  let subcategoryDim1OnlyId: bigint;
  let selectionOnlyId: bigint;

  // Subcategory with no dimensions at all.
  let subcategoryNoDimsId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);

    const rateUnits = await prisma.rateMeasurementUnit.findMany({
      select: { id: true },
      take: 2,
    });
    if (rateUnits.length < 2) {
      throw new Error("At least 2 RateMeasurementUnits must be seeded");
    }
    rateUnitId = rateUnits[0].id;
    secondRateUnitId = rateUnits[1].id;

    const subcategoryIds = await getSubcategoryIds(prisma, methodologyVersionId);

    // Find subcategories (among this methodology's) that currently have no
    // EmissionFactorDimension rows, so we can attach our own without
    // colliding with the seeded (subcategoryId, position) partial-unique index.
    const noDimSubcategories = await prisma.subcategory.findMany({
      where: {
        id: { in: subcategoryIds },
        dimensions: { none: {} },
      },
      select: { id: true },
      take: 3,
    });
    if (noDimSubcategories.length < 3) {
      throw new Error(
        "Expected at least 3 dimension-less subcategories to seed test dimensions"
      );
    }
    [subcategoryBothDimsId, subcategoryDim1OnlyId, subcategoryNoDimsId] =
      noDimSubcategories.map((s) => s.id);

    const dimension1 = await prisma.emissionFactorDimension.create({
      data: {
        subcategoryId: subcategoryBothDimsId,
        code: "TEST_DIM_1",
        name: "Test Dimension 1",
        position: 1,
        isRequired: true,
        updatedAt: null,
      },
    });
    const dimension2 = await prisma.emissionFactorDimension.create({
      data: {
        subcategoryId: subcategoryBothDimsId,
        code: "TEST_DIM_2",
        name: "Test Dimension 2",
        position: 2,
        isRequired: true,
        updatedAt: null,
      },
    });
    const dimensionOnly = await prisma.emissionFactorDimension.create({
      data: {
        subcategoryId: subcategoryDim1OnlyId,
        code: "TEST_DIM_ONLY",
        name: "Test Dimension Only",
        position: 1,
        isRequired: true,
        updatedAt: null,
      },
    });

    const value1 = await prisma.emissionFactorDimensionValue.create({
      data: { dimensionId: dimension1.id, value: "TestValue1", updatedAt: null },
    });
    const value2 = await prisma.emissionFactorDimensionValue.create({
      data: { dimensionId: dimension2.id, value: "TestValue2", updatedAt: null },
    });
    const valueOnly = await prisma.emissionFactorDimensionValue.create({
      data: {
        dimensionId: dimensionOnly.id,
        value: "OnlyValue",
        updatedAt: null,
      },
    });
    selection1Id = value1.id;
    selection2Id = value2.id;
    selectionOnlyId = valueOnly.id;
  });

  afterAll(async () => {
    await prisma.emissionFactorDimensionValue.deleteMany({
      where: {
        dimension: {
          subcategoryId: { in: [subcategoryBothDimsId, subcategoryDim1OnlyId] },
        },
      },
    });
    await prisma.emissionFactorDimension.deleteMany({
      where: {
        subcategoryId: { in: [subcategoryBothDimsId, subcategoryDim1OnlyId] },
      },
    });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.carbonInventoryLineFactor.deleteMany({});
    await prisma.emissionFactor.deleteMany({});
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("returns [] for an inventory with no lines", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toEqual([]);
    });

    it("exposes a line-factor row with gas breakdown, joined activity parameter, and factor source detail", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "EXPERT",
        methodologyVersionId,
      });
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryBothDimsId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "EXPERT",
        selection1Id,
        selection2Id,
        quantity: new Prisma.Decimal(10),
      });

      const emissionFactor = await prisma.emissionFactor.create({
        data: {
          subcategoryId: subcategoryBothDimsId,
          dimensionValue1Id: selection1Id,
          dimensionValue2Id: selection2Id,
          rateMeasurementUnitId: rateUnitId,
          source: "IPCC 2019 - Fuels - Coal (industrial) - tonnes",
          gasDetails: { co2: 100, ch4: 5, n2o: 0 },
          value: new Prisma.Decimal(2.5),
          updatedAt: null,
        },
      });

      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(2.5),
        appliedFactorRateUnitId: secondRateUnitId,
        emissionFactorId: emissionFactor.id,
        appliedFactorSource: null,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toHaveLength(1);

      const row = body[0];
      expect(row.id).toBe(emissionFactor.id.toString());
      expect(row.activityParameter).toBe("TestValue1 / TestValue2");
      expect(row.factorValue).toBe(2.5);
      expect(row.gasBreakdownLines).toEqual(
        expect.arrayContaining([
          { value: 100, gas: "CO₂" },
          { value: 5, gas: "CH4" },
        ])
      );
      expect(row.gasBreakdownLines).toHaveLength(2);
      expect(row.factorSource).toBe("IPCC 2019");
      expect(row.factorSourceDetail).toBe("Fuels - Coal (industrial) - tonnes");

      const rateUnit = await prisma.rateMeasurementUnit.findUniqueOrThrow({
        where: { id: secondRateUnitId },
      });
      expect(row.rateUnit).toBe(rateUnit.abbreviation);
    });

    it("exposes a manual-factor row (no line factor) with a manual- prefixed id and single-dimension activity parameter", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "EXPERT",
        methodologyVersionId,
      });
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryDim1OnlyId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "EXPERT",
        selection1Id: selectionOnlyId,
        manualFactor: new Prisma.Decimal(1.75),
      });
      await prisma.carbonInventoryLineInput.update({
        where: { id: input.id },
        data: {
          manualFactorSource: "Custom Estimate - Site A",
          manualFactorRateUnitId: rateUnitId,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toHaveLength(1);

      const row = body[0];
      expect(row.id).toBe(`manual-${line.id}`);
      expect(row.activityParameter).toBe("OnlyValue");
      expect(row.factorValue).toBe(1.75);
      expect(row.gasBreakdownLines).toEqual([]);
      expect(row.factorSource).toBe("Custom Estimate");
      expect(row.factorSourceDetail).toBe("Site A");

      const rateUnit = await prisma.rateMeasurementUnit.findUniqueOrThrow({
        where: { id: rateUnitId },
      });
      expect(row.rateUnit).toBe(rateUnit.abbreviation);
    });

    it("falls back to the subcategory name as the activity parameter when it has no dimensions", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryNoDimsId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
        manualFactor: new Prisma.Decimal(3),
      });
      await prisma.carbonInventoryLineInput.update({
        where: { id: input.id },
        data: { manualFactorRateUnitId: rateUnitId },
      });

      const subcategory = await prisma.subcategory.findUniqueOrThrow({
        where: { id: subcategoryNoDimsId },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].activityParameter).toBe(subcategory.name);
      // No manualFactorSource was set — the source falls back to the empty string.
      expect(body[0].factorSource).toBe("");
      expect(body[0].factorSourceDetail).toBeNull();
    });

    it("de-duplicates rows that share the same emission factor across multiple lines", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "EXPERT",
        methodologyVersionId,
      });

      const emissionFactor = await prisma.emissionFactor.create({
        data: {
          subcategoryId: subcategoryDim1OnlyId,
          dimensionValue1Id: selectionOnlyId,
          rateMeasurementUnitId: rateUnitId,
          source: "Shared Factor",
          gasDetails: {},
          value: new Prisma.Decimal(1),
          updatedAt: null,
        },
      });

      const lineA = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryDim1OnlyId
      );
      const inputA = await createCarbonInventoryLineInput(prisma, lineA.id, {
        inputType: "EXPERT",
        selection1Id: selectionOnlyId,
      });
      await createCarbonInventoryLineFactor(prisma, inputA.id, {
        appliedFactorValue: new Prisma.Decimal(1),
        appliedFactorRateUnitId: rateUnitId,
        emissionFactorId: emissionFactor.id,
      });

      const lineB = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryDim1OnlyId
      );
      const inputB = await createCarbonInventoryLineInput(prisma, lineB.id, {
        inputType: "EXPERT",
        selection1Id: selectionOnlyId,
      });
      await createCarbonInventoryLineFactor(prisma, inputB.id, {
        appliedFactorValue: new Prisma.Decimal(1),
        appliedFactorRateUnitId: rateUnitId,
        emissionFactorId: emissionFactor.id,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      // Both lines reference the same emission factor id — only one row is
      // returned instead of two.
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(emissionFactor.id.toString());
    });

    it("skips a line with no active input", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      // Line created, but no CarbonInventoryLineInput at all.
      await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryNoDimsId
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toEqual([]);
    });

    it("skips a line whose input has neither a line factor nor a manual factor", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryNoDimsId
      );
      // Input with quantity but no factor and no manualFactor.
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
        quantity: new Prisma.Decimal(5),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toEqual([]);
    });

    it("ignores OUTDATED/DELETED lines (only ACTIVE lines are considered)", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryNoDimsId,
        { status: "DELETED" }
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
        manualFactor: new Prisma.Decimal(9),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emission-factors`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetEmissionFactorsResponse;
      expect(body).toEqual([]);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity) — the anonymous access
    // hook rejects unknown inventory ids before the service layer's own
    // not-found check is reached.
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/emission-factors",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
