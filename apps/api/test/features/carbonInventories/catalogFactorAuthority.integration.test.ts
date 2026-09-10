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
import {
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  getTestRateMeasurementUnitIdByAbbreviation,
} from "@test/factories/emissionFactorFactory.js";
import { FactorSelectionType } from "@repo/types";
import type { SyncCarbonInventoryLinesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { EmissionFactorStatus, type PrismaClient } from "@repo/database";

/**
 * The API is the authority for a catalog factor.
 *
 * A CATALOG selection carries an identity and the unit it wants the value in,
 * and nothing else. Everything a line records about the factor — its value, its
 * source, its year, and the result computed from it — is read from the catalog
 * row inside the sync transaction. These tests hold that line: they prove the
 * snapshot comes from the row, that a request cannot substitute its own numbers,
 * and that a selection which does not belong to the line is rejected rather than
 * quietly applied.
 *
 * They also pin the reproducibility rule the year feature depends on: an applied
 * year is history. Editing the catalog or re-dating the inventory afterwards
 * changes nothing that was already saved.
 */
describe("Catalog factor authority and snapshots - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  let kgPerKgId: bigint;
  let kgPerTonId: bigint;
  let kgPerKwhId: bigint;
  let kgPerM3Id: bigint;
  let kgId: bigint;
  let tonId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    kgPerKgId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/kg"
    );
    kgPerTonId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/ton"
    );
    kgPerKwhId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/kWh"
    );
    kgPerM3Id = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/m3"
    );
    kgId = (
      await prisma.measurementUnit.findUniqueOrThrow({
        where: { abbreviation: "kg" },
        select: { id: true },
      })
    ).id;
    tonId = (
      await prisma.measurementUnit.findUniqueOrThrow({
        where: { abbreviation: "ton" },
        select: { id: true },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - Authority" } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - Authority" } },
    });
  });

  /**
   * An inventory whose methodology holds one subcategory with a required
   * dimension, plus a dated mass/mass catalog factor for one of its values.
   */
  async function buildScenario(options?: { inventoryYear?: number }) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - Authority ${Date.now()}-${Math.random()}`,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Authority Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Authority Subcategory",
    });
    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { position: 1, isRequired: true, name: "Material" }
    );
    const clinker = await createTestEmissionFactorDimensionValue(
      prisma,
      dimension.id,
      { value: "Clinker" }
    );
    const other = await createTestEmissionFactorDimensionValue(
      prisma,
      dimension.id,
      { value: "Cal" }
    );

    // 520 kg CO2e per ton of clinker, published for 2022.
    const factor = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      kgPerTonId,
      {
        dimensionValue1Id: clinker.id,
        source: "IPCC",
        year: 2022,
        value: "520",
      }
    );

    const carbonInventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      {
        methodologyVersionId: methodology.id,
        year: options?.inventoryYear ?? 2022,
      }
    );

    return {
      methodology,
      subcategory,
      clinker,
      other,
      factor,
      carbonInventory,
    };
  }

  function syncPayload(overrides: {
    subcategoryId: bigint;
    dimensionValue1Id: bigint | null;
    measurementUnitId: bigint;
    quantity: number;
    factorSelection: Record<string, unknown>;
  }) {
    return {
      create: [
        {
          subcategoryId: overrides.subcategoryId.toString(),
          dimensionValue1Id: overrides.dimensionValue1Id?.toString() ?? null,
          dimensionValue2Id: null,
          measurementUnitId: overrides.measurementUnitId.toString(),
          quantity: overrides.quantity,
          factorSelection: overrides.factorSelection,
          comment: null,
          inputType: "SIMPLIFIED",
        },
      ],
      update: [],
      delete: [],
    };
  }

  const sync = async (
    carbonInventoryId: bigint,
    payload: Record<string, unknown>
  ) =>
    await app.inject({
      method: "POST",
      url: `/api/carbon-inventories/${carbonInventoryId}/lines/sync`,
      payload,
    });

  describe("The server derives the catalog snapshot", () => {
    it("snapshots the catalog value, source and year, and computes the result", async () => {
      const scenario = await buildScenario();

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: scenario.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;
      const line = body.created[0];

      expect(line.factorSource).toBe("IPCC");
      expect(line.factorValue).toBe(520);
      expect(line.appliedFactorYear).toBe(2022);
      expect(line.emissionFactorId).toBe(scenario.factor.id.toString());

      const result = await prisma.carbonInventoryLineResult.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(line.id) } } },
        select: { totalEmissions: true },
      });
      expect(result.totalEmissions.toString()).toBe("5200");
    });

    it("converts the catalog value into a compatible unit of the same family", async () => {
      const scenario = await buildScenario();

      // The factor is stored as 520 kg/ton; asked for in kg/kg it must become
      // 0.52, and the result must follow from the converted value.
      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: kgId,
          quantity: 1000,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: scenario.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerKgId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(200);
      const line = (
        JSON.parse(response.body) as SyncCarbonInventoryLinesResponse
      ).created[0];

      expect(line.factorValue).toBe(0.52);
      expect(line.factorRateMeasurementUnitId).toBe(kgPerKgId.toString());
      // Same physical quantity as 10 ton at 520 kg/ton.
      const result = await prisma.carbonInventoryLineResult.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(line.id) } } },
        select: { totalEmissions: true },
      });
      expect(Number(result.totalEmissions)).toBeCloseTo(520, 6);
    });

    it("ignores client-authored value, source and year by construction", async () => {
      const scenario = await buildScenario();

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: scenario.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerTonId.toString(),
            // A client trying to talk the API into a different number.
            value: 999999,
            source: "Spoofed",
            year: 1999,
          },
        })
      );

      // The CATALOG variant is a strict object, so the extra fields are refused
      // outright rather than silently dropped.
      expect(response.statusCode).toBe(400);

      const persisted = await prisma.carbonInventoryLineFactor.count({
        where: { appliedFactorSource: "Spoofed" },
      });
      expect(persisted).toBe(0);
    });
  });

  describe("A selection that does not belong to the line is rejected", () => {
    it("rejects a factor that is no longer active", async () => {
      const scenario = await buildScenario();
      await prisma.emissionFactor.update({
        where: { id: scenario.factor.id },
        data: { status: EmissionFactorStatus.DELETED },
      });

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: scenario.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        code: "CATALOG_EMISSION_FACTOR_NOT_FOUND",
      });
    });

    it("rejects a factor belonging to another methodology", async () => {
      const scenario = await buildScenario();
      const foreign = await buildScenario();

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: foreign.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toMatchObject({
        code: "CATALOG_EMISSION_FACTOR_NOT_IN_METHODOLOGY",
      });
    });

    it("rejects a factor whose required dimension value differs from the line's", async () => {
      const scenario = await buildScenario();

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          // The factor is the Clinker one; the line says Cal.
          dimensionValue1Id: scenario.other.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CATALOG,
            emissionFactorId: scenario.factor.id.toString(),
            appliedRateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(422);
      expect(JSON.parse(response.body)).toMatchObject({
        code: "CATALOG_EMISSION_FACTOR_DIMENSION_MISMATCH",
      });
    });

    it("rejects an applied unit from an incompatible family", async () => {
      const scenario = await buildScenario();

      // The factor is mass/mass; kg/m3 is mass/volume. There is no conversion
      // between them, so this is a rejection rather than a best effort.
      for (const incompatible of [kgPerM3Id, kgPerKwhId]) {
        const response = await sync(
          scenario.carbonInventory.id,
          syncPayload({
            subcategoryId: scenario.subcategory.id,
            dimensionValue1Id: scenario.clinker.id,
            measurementUnitId: tonId,
            quantity: 10,
            factorSelection: {
              type: FactorSelectionType.CATALOG,
              emissionFactorId: scenario.factor.id.toString(),
              appliedRateMeasurementUnitId: incompatible.toString(),
            },
          })
        );

        expect(response.statusCode).toBe(422);
        expect(JSON.parse(response.body)).toMatchObject({
          code: "CATALOG_EMISSION_FACTOR_UNIT_FAMILY_MISMATCH",
        });
      }
    });
  });

  describe("Custom factors and direct totals keep their own paths", () => {
    it("stores a custom factor with no catalog identity and no year", async () => {
      const scenario = await buildScenario();

      const response = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CUSTOM,
            source: "Otro",
            value: 3.5,
            rateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );

      expect(response.statusCode).toBe(200);
      const line = (
        JSON.parse(response.body) as SyncCarbonInventoryLinesResponse
      ).created[0];

      expect(line.factorSource).toBe("Otro");
      expect(line.factorValue).toBe(3.5);
      // Neither field is set, which is what keeps a custom factor out of the
      // year-mismatch warning entirely.
      expect(line.emissionFactorId).toBeNull();
      expect(line.appliedFactorYear).toBeNull();
    });

    it("stores a direct total with no factor snapshot at all", async () => {
      const scenario = await buildScenario();

      const response = await sync(scenario.carbonInventory.id, {
        create: [
          {
            subcategoryId: scenario.subcategory.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSelection: {
              type: FactorSelectionType.DIRECT,
              totalEmissions: 12,
            },
            comment: null,
            inputType: "DIRECT",
          },
        ],
        update: [],
        delete: [],
      });

      expect(response.statusCode).toBe(200);
      const line = (
        JSON.parse(response.body) as SyncCarbonInventoryLinesResponse
      ).created[0];

      expect(line.manualTotalEmissions).toBe(12);
      expect(line.emissionFactorId).toBeNull();
      expect(line.appliedFactorYear).toBeNull();

      const factorRows = await prisma.carbonInventoryLineFactor.count({
        where: { lineInput: { line: { id: BigInt(line.id) } } },
      });
      expect(factorRows).toBe(0);
    });
  });

  describe("The applied year is history", () => {
    it("keeps the snapshot when the catalog row is later edited", async () => {
      const scenario = await buildScenario();

      const created = (
        JSON.parse(
          (
            await sync(
              scenario.carbonInventory.id,
              syncPayload({
                subcategoryId: scenario.subcategory.id,
                dimensionValue1Id: scenario.clinker.id,
                measurementUnitId: tonId,
                quantity: 10,
                factorSelection: {
                  type: FactorSelectionType.CATALOG,
                  emissionFactorId: scenario.factor.id.toString(),
                  appliedRateMeasurementUnitId: kgPerTonId.toString(),
                },
              })
            )
          ).body
        ) as SyncCarbonInventoryLinesResponse
      ).created[0];

      // The maintainer revises the catalog row after the fact.
      await prisma.emissionFactor.update({
        where: { id: scenario.factor.id },
        data: { year: 2025, value: "600", source: "IPCC revisado" },
      });

      const snapshot = await prisma.carbonInventoryLineFactor.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(created.id) } } },
        select: {
          appliedFactorValue: true,
          appliedFactorSource: true,
          appliedFactorYear: true,
        },
      });

      expect(Number(snapshot.appliedFactorValue)).toBe(520);
      expect(snapshot.appliedFactorSource).toBe("IPCC");
      expect(snapshot.appliedFactorYear).toBe(2022);
    });

    it("leaves every line and result untouched when the inventory is re-dated", async () => {
      const scenario = await buildScenario({ inventoryYear: 2022 });

      const created = (
        JSON.parse(
          (
            await sync(
              scenario.carbonInventory.id,
              syncPayload({
                subcategoryId: scenario.subcategory.id,
                dimensionValue1Id: scenario.clinker.id,
                measurementUnitId: tonId,
                quantity: 10,
                factorSelection: {
                  type: FactorSelectionType.CATALOG,
                  emissionFactorId: scenario.factor.id.toString(),
                  appliedRateMeasurementUnitId: kgPerTonId.toString(),
                },
              })
            )
          ).body
        ) as SyncCarbonInventoryLinesResponse
      ).created[0];

      const selectSnapshot = {
        emissionFactorId: true,
        appliedFactorValue: true,
        appliedFactorRateUnitId: true,
        appliedFactorSource: true,
        appliedFactorYear: true,
      } as const;

      const before = await prisma.carbonInventoryLineFactor.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(created.id) } } },
        select: selectSnapshot,
      });
      const resultBefore =
        await prisma.carbonInventoryLineResult.findFirstOrThrow({
          where: { lineInput: { line: { id: BigInt(created.id) } } },
          select: { totalEmissions: true },
        });

      await prisma.carbonInventory.update({
        where: { id: scenario.carbonInventory.id },
        data: { year: 2023 },
      });

      const after = await prisma.carbonInventoryLineFactor.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(created.id) } } },
        select: selectSnapshot,
      });
      const resultAfter =
        await prisma.carbonInventoryLineResult.findFirstOrThrow({
          where: { lineInput: { line: { id: BigInt(created.id) } } },
          select: { totalEmissions: true },
        });

      // Every field, not just the year: re-dating must not be a back door into
      // re-resolving a factor or recomputing a declared number.
      expect(after).toEqual(before);
      expect(resultAfter.totalEmissions.toString()).toBe(
        resultBefore.totalEmissions.toString()
      );
      // The same snapshot is now a mismatch, derived rather than stored.
      expect(after.appliedFactorYear).toBe(2022);
    });
  });
});
