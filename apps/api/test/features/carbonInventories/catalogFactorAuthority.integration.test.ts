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
  /**
   * An update that does not restate its factor.
   *
   * The organization edited something else on the line — a quantity, a comment —
   * and said nothing about the factor. The stored snapshot is then the only
   * correct answer: not the catalog's current value, which may have moved, and
   * not an error, which is what a re-resolution against a retired row produces.
   */
  describe("An unchanged selection keeps the stored snapshot", () => {
    /** Captures a line through a CATALOG selection and returns its id. */
    async function captureCatalogLine(scenario: {
      subcategory: { id: bigint };
      clinker: { id: bigint };
      factor: { id: bigint };
      carbonInventory: { id: bigint };
    }) {
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
      return body.created[0];
    }

    const unchangedUpdate = (
      lineId: string,
      overrides: {
        dimensionValue1Id: bigint;
        measurementUnitId: bigint;
        quantity: number;
      }
    ) => ({
      create: [],
      update: [
        {
          id: lineId,
          inputType: "SIMPLIFIED",
          dimensionValue1Id: overrides.dimensionValue1Id.toString(),
          dimensionValue2Id: null,
          measurementUnitId: overrides.measurementUnitId.toString(),
          quantity: overrides.quantity,
          factorSelection: { type: FactorSelectionType.UNCHANGED },
          comment: "Only the quantity changed",
        },
      ],
      delete: [],
    });

    const readSnapshot = async (lineId: string) =>
      await prisma.carbonInventoryLineFactor.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(lineId) }, isActive: true } },
        select: {
          emissionFactorId: true,
          appliedFactorValue: true,
          appliedFactorRateUnitId: true,
          appliedFactorSource: true,
          appliedFactorYear: true,
        },
      });

    it("does not adopt a catalog value edited after capture", async () => {
      const scenario = await buildScenario();
      const line = await captureCatalogLine(scenario);
      const before = await readSnapshot(line.id);

      // The maintainer corrects the factor after the organization used it.
      await prisma.emissionFactor.update({
        where: { id: scenario.factor.id },
        data: { value: "999", source: "IPCC revisado", year: 2024 },
      });

      const response = await sync(
        scenario.carbonInventory.id,
        unchangedUpdate(line.id, {
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 25,
        })
      );

      expect(response.statusCode).toBe(200);
      expect(await readSnapshot(line.id)).toEqual(before);

      // The result follows the quantity the user did change, computed from the
      // value the line kept — not from the catalog's new one.
      const result = await prisma.carbonInventoryLineResult.findFirstOrThrow({
        where: { lineInput: { line: { id: BigInt(line.id) }, isActive: true } },
        select: { totalEmissions: true },
      });
      expect(result.totalEmissions.toString()).toBe("13000");
    });

    it("saves a line whose catalog factor was retired", async () => {
      const scenario = await buildScenario();
      const line = await captureCatalogLine(scenario);
      const before = await readSnapshot(line.id);

      await prisma.emissionFactor.update({
        where: { id: scenario.factor.id },
        data: { status: EmissionFactorStatus.DELETED },
      });

      const response = await sync(
        scenario.carbonInventory.id,
        unchangedUpdate(line.id, {
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 25,
        })
      );

      // Re-resolving would 404 here and roll back the whole batch, including
      // every unrelated line in it.
      expect(response.statusCode).toBe(200);
      expect(await readSnapshot(line.id)).toEqual(before);
    });

    it("carries a custom factor's own columns across", async () => {
      const scenario = await buildScenario();

      const created = await sync(
        scenario.carbonInventory.id,
        syncPayload({
          subcategoryId: scenario.subcategory.id,
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 10,
          factorSelection: {
            type: FactorSelectionType.CUSTOM,
            source: "Otro",
            value: 7.25,
            rateMeasurementUnitId: kgPerTonId.toString(),
          },
        })
      );
      expect(created.statusCode).toBe(200);
      const line = (
        JSON.parse(created.body) as SyncCarbonInventoryLinesResponse
      ).created[0];

      const response = await sync(
        scenario.carbonInventory.id,
        unchangedUpdate(line.id, {
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 4,
        })
      );
      expect(response.statusCode).toBe(200);

      // A custom factor lives on the line input as well as in the snapshot; if
      // only the snapshot were carried over the line would read as a catalog
      // line with no catalog row behind it.
      const input = await prisma.carbonInventoryLineInput.findFirstOrThrow({
        where: { lineId: BigInt(line.id), isActive: true },
        select: {
          manualFactor: true,
          manualFactorSource: true,
          manualFactorRateUnitId: true,
        },
      });
      expect(input.manualFactor?.toString()).toBe("7.25");
      expect(input.manualFactorSource).toBe("Otro");
      expect(input.manualFactorRateUnitId).toBe(kgPerTonId);

      const snapshot = await readSnapshot(line.id);
      expect(snapshot.emissionFactorId).toBeNull();
      expect(snapshot.appliedFactorSource).toBe("Otro");
    });

    it("means no factor when the line never had one", async () => {
      const scenario = await buildScenario();

      const created = await sync(scenario.carbonInventory.id, {
        create: [
          {
            subcategoryId: scenario.subcategory.id.toString(),
            inputType: "SIMPLIFIED",
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSelection: null,
            comment: null,
          },
        ],
        update: [],
        delete: [],
      });
      expect(created.statusCode).toBe(200);
      const line = (
        JSON.parse(created.body) as SyncCarbonInventoryLinesResponse
      ).created[0];

      const response = await sync(
        scenario.carbonInventory.id,
        unchangedUpdate(line.id, {
          dimensionValue1Id: scenario.clinker.id,
          measurementUnitId: tonId,
          quantity: 3,
        })
      );

      // Degrades to "still incomplete" rather than erroring: an empty line is a
      // normal state in capture, not a broken request.
      expect(response.statusCode).toBe(200);
      const snapshot = await prisma.carbonInventoryLineFactor.findFirst({
        where: { lineInput: { line: { id: BigInt(line.id) }, isActive: true } },
      });
      expect(snapshot).toBeNull();
    });

    it("is not part of the create contract", async () => {
      const scenario = await buildScenario();

      const response = await sync(scenario.carbonInventory.id, {
        create: [
          {
            subcategoryId: scenario.subcategory.id.toString(),
            inputType: "SIMPLIFIED",
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSelection: { type: FactorSelectionType.UNCHANGED },
            comment: null,
          },
        ],
        update: [],
        delete: [],
      });

      // A line being created has no snapshot to keep, so the variant is
      // unrepresentable there rather than silently meaning "no factor".
      expect(response.statusCode).toBe(400);
    });
  });
});
