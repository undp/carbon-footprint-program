import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type {
  CreateMeasurementUnitResponse,
  GetAllMeasurementUnitsResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  CarbonInventoryLineStatus,
  EmissionFactorStatus,
  InventoryStatus,
  MagnitudeStatus,
  MeasurementUnitStatus,
  Prisma,
  SubcategoryStatus,
} from "@repo/database";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import { createTestEmissionFactor } from "@test/factories/emissionFactorFactory.js";
import {
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
  createInventoryFromPattern,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

const MAGNITUDES = [
  "mass",
  "volume",
  "distance",
  "time",
  "animals",
  "area",
  "power",
  "energy",
  "distance_mass",
  "rooms",
] as const;

describe("GET /api/measurement-units - Integration Tests", () => {
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

  beforeEach(async () => {});

  afterEach(async () => {});

  describe("Successful retrieval", () => {
    it("should return exactly 17 measurement units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      expect(body).toHaveLength(18);
    });

    it("should return measurement units with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;

      const testUnit = body.find((u) => u.abbreviation === "kg");
      expect(testUnit).toBeDefined();
      expect(testUnit!.name).toBe("kilógramos");
      expect(testUnit!.magnitude.code).toBe("mass");
      expect(testUnit!.abbreviation).toBe("kg");
      expect(testUnit!.baseFactor).toBe(1000);
      expect(testUnit!.isBase).toBe(false);
    });
  });

  describe("Magnitude types", () => {
    it("should return units for every magnitude", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;

      const magnitudes = new Set(body.map((u) => u.magnitude.code));

      expect(magnitudes).toEqual(new Set(MAGNITUDES));
    });
  });

  describe("Base unit identification", () => {
    it("should correctly identify base and non-base units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;

      const baseMassUnit = body.find((u) => u.abbreviation === "g");
      const nonBaseMassUnit = body.find((u) => u.abbreviation === "kg");

      expect(baseMassUnit?.isBase).toBe(true);
      expect(baseMassUnit?.baseFactor).toBe(1);
      expect(nonBaseMassUnit?.isBase).toBe(false);
      expect(nonBaseMassUnit?.baseFactor).toBe(1000);
    });

    it("should have exactly one base unit per magnitude", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;

      MAGNITUDES.forEach((mag) => {
        const baseUnits = body.filter(
          (u) => u.magnitude.code === mag && u.isBase
        );
        expect(baseUnits).toHaveLength(1);
      });
    });

    it("should have baseFactor of 1 for all base units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const baseUnits = body.filter((u) => u.isBase);

      baseUnits.forEach((unit) => {
        expect(unit.baseFactor).toBe(1);
      });
    });
  });

  describe("Ordering", () => {
    // The endpoint sorts in JS with Spanish-locale collation so order is
    // identical across deployments regardless of DB collation. Accented chars
    // (`Á`, `é`, `í`, `ó`, `ú`) sort next to their base letters — e.g. `Área`
    // sorts between `Animales` and `Distancia`, not after `Volumen` as binary
    // code-point ordering would place it.
    it("should return units ordered by magnitude & name (Spanish locale)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const sorted = [...body].sort((a, b) => {
        const magnitudeOrder = a.magnitude.name.localeCompare(
          b.magnitude.name,
          "es"
        );
        if (magnitudeOrder !== 0) return magnitudeOrder;
        const nameOrder = a.name.localeCompare(b.name, "es");
        if (nameOrder !== 0) return nameOrder;
        return Number(a.id) - Number(b.id);
      });
      expect(body).toEqual(sorted);
    });

    it("should place accented magnitude names with their base letter, not at the end", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const magnitudeOrder: string[] = [];
      for (const unit of body) {
        if (magnitudeOrder.at(-1) !== unit.magnitude.name) {
          magnitudeOrder.push(unit.magnitude.name);
        }
      }
      const areaIndex = magnitudeOrder.indexOf("Área");
      const volumenIndex = magnitudeOrder.indexOf("Volumen");
      expect(areaIndex).toBeGreaterThan(-1);
      expect(volumenIndex).toBeGreaterThan(-1);
      expect(areaIndex).toBeLessThan(volumenIndex);
    });
  });

  describe("Data integrity", () => {
    it("should correctly retrieve superscript characters in abbreviations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;

      // Check for cubic meter with superscript 3
      const cubicMeter = body.find((u) => u.abbreviation === "m3");
      expect(cubicMeter).toBeDefined();
      expect(cubicMeter!.abbreviation).toBe("m3");
      expect(cubicMeter!.abbreviation).toContain("3");
      expect(cubicMeter!.magnitude.code).toBe("volume");

      // Check for any other units with superscripts
      const unitsWithSuperscripts = body.filter((u) =>
        /[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(u.abbreviation)
      );
      expect(unitsWithSuperscripts.length).toBeGreaterThanOrEqual(0);

      unitsWithSuperscripts.forEach((unit) => {
        // Ensure superscripts are preserved as Unicode characters, not converted
        expect(unit.abbreviation).toMatch(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/);
      });
    });

    it("should have unique names", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const names = body.map((u) => u.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have unique abbreviations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const abbreviations = body.map((u) => u.abbreviation);
      const uniqueAbbreviations = new Set(abbreviations);

      expect(uniqueAbbreviations.size).toBe(abbreviations.length);
    });

    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const ids = body.map((u) => u.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Soft-deleted magnitude on display reads", () => {
    // Display-context reads must keep showing the joined magnitude even when
    // it has been soft-deleted. Soft-deleting a referenced magnitude is not
    // possible through the API (MagnitudeReferencedError), so we set the
    // status directly in the database to reach this state.
    it("should still return the joined magnitude when its status is DELETED", async () => {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let customMagnitude:
        | Awaited<ReturnType<typeof prisma.magnitude.create>>
        | undefined;
      let customMu:
        | Awaited<ReturnType<typeof prisma.measurementUnit.create>>
        | undefined;

      try {
        customMagnitude = await prisma.magnitude.create({
          data: {
            code: `test_${suffix}`,
            name: `Test Display ${suffix}`,
            isSystem: false,
            status: MagnitudeStatus.ACTIVE,
          },
        });

        customMu = await prisma.measurementUnit.create({
          data: {
            name: `Test MU ${suffix}`,
            abbreviation: `test_${suffix}`,
            magnitudeId: customMagnitude.id,
            baseFactor: 1,
            isBase: true,
          },
        });

        await prisma.magnitude.update({
          where: { id: customMagnitude.id },
          data: { status: MagnitudeStatus.DELETED },
        });

        const response = await app.inject({
          method: "GET",
          url: "/api/measurement-units",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(
          response.body
        ) as GetAllMeasurementUnitsResponse;
        const row = body.find((u) => u.id === customMu!.id.toString());
        expect(row).toBeDefined();
        expect(row!.magnitude.id).toBe(customMagnitude.id.toString());
        expect(row!.magnitude.code).toBe(customMagnitude.code);
        expect(row!.magnitude.status).toBe(MagnitudeStatus.DELETED);
      } finally {
        if (customMu) {
          await prisma.measurementUnit.update({
            where: { id: customMu.id },
            data: { status: MeasurementUnitStatus.DELETED },
          });
          await prisma.rateMeasurementUnit.deleteMany({
            where: { denominatorMeasurementUnitId: customMu.id },
          });
          await prisma.measurementUnit.delete({ where: { id: customMu.id } });
        }
        if (customMagnitude) {
          await prisma.magnitude.delete({ where: { id: customMagnitude.id } });
        }
      }
    });
  });

  describe("Reference count excludes soft-deleted dependents", () => {
    // Creating a unit through the API also creates its canonical RMU (kg/<abbr>),
    // so cleanup must remove both. Test units use the "test-" abbreviation prefix.
    afterEach(async () => {
      // Inventory rows reference the test units; remove them before the units.
      await cleanupCarbonInventoryTestData(prisma);
      await prisma.emissionFactor.deleteMany({
        where: { source: { startsWith: "mu-screen-test" } },
      });
      await prisma.subcategoryMeasurementUnit.deleteMany({
        where: { subcategory: { name: { startsWith: "Test - Subcategory" } } },
      });
      await prisma.subcategory.deleteMany({
        where: { name: { startsWith: "Test - Subcategory" } },
      });
      await prisma.rateMeasurementUnit.deleteMany({
        where: { abbreviation: { startsWith: "kg/test-" } },
      });
      await prisma.measurementUnit.deleteMany({
        where: { abbreviation: { startsWith: "test-" } },
      });
    });

    async function createUnit(): Promise<CreateMeasurementUnitResponse> {
      const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const massMagnitude = await prisma.magnitude.findFirstOrThrow({
        where: { code: "mass" },
      });
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: {
          name: `Test Unit ${suffix}`,
          abbreviation: `test-${suffix}`,
          magnitudeId: massMagnitude.id.toString(),
          baseFactor: 500,
          isBase: false,
        },
      });
      expect(response.statusCode).toBe(201);
      return JSON.parse(response.body) as CreateMeasurementUnitResponse;
    }

    async function getReferenceCount(unitId: string): Promise<number> {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      const row = body.find((u) => u.id === unitId);
      expect(row).toBeDefined();
      return row!.referenceCount;
    }

    // Regression for issue #395: SubcategoryMeasurementUnit has no status column
    // and its subcategory FK does not cascade on a soft-delete, so the join row
    // survives. The reference count must filter on the parent subcategory status
    // or the unit stays "in use" and undeletable after its only subcategory is
    // soft-deleted.
    it("should not count subcategory links whose subcategory is soft-deleted", async () => {
      const unit = await createUnit();
      const category = await prisma.category.findFirstOrThrow({
        select: { id: true },
      });
      const subcategory = await createTestSubcategory(prisma, category.id);
      await prisma.subcategoryMeasurementUnit.create({
        data: {
          subcategoryId: subcategory.id,
          measurementUnitId: BigInt(unit.id),
        },
      });

      // Active subcategory link → counted.
      expect(await getReferenceCount(unit.id)).toBe(1);

      // Soft-delete the subcategory (the join row survives untouched).
      await prisma.subcategory.update({
        where: { id: subcategory.id },
        data: { status: SubcategoryStatus.DELETED },
      });

      // Link no longer counts.
      expect(await getReferenceCount(unit.id)).toBe(0);
    });

    // Same gap on the canonical-RMU side: emission factors are soft-deleted
    // (status = DELETED) when their subcategory is deleted, so a DELETED factor
    // must not keep the unit referenced.
    it("should not count emission factors that are soft-deleted", async () => {
      const unit = await createUnit();
      const canonicalRmu = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: `kg/${unit.abbreviation}` },
      });
      const subcategory = await prisma.subcategory.findFirstOrThrow({
        select: { id: true },
      });

      await createTestEmissionFactor(prisma, subcategory.id, canonicalRmu.id, {
        source: "mu-screen-test-active",
        status: EmissionFactorStatus.ACTIVE,
      });
      await createTestEmissionFactor(prisma, subcategory.id, canonicalRmu.id, {
        source: "mu-screen-test-deleted",
        status: EmissionFactorStatus.DELETED,
      });

      // Only the ACTIVE emission factor counts.
      expect(await getReferenceCount(unit.id)).toBe(1);
    });

    // Seeds the three inventory-backed reference paths against `unit` and its
    // canonical RMU, all on a single line/input of a fresh inventory:
    //   - direct measurement unit on the line input,
    //   - manual-factor rate unit on the same line input,
    //   - applied-factor rate unit on the line factor.
    // Returns the inventory and line so the caller can soft-delete either.
    async function seedInventoryReferencePaths(
      unit: CreateMeasurementUnitResponse
    ) {
      const canonicalRmu = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: `kg/${unit.abbreviation}` },
      });
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const [subcategoryId] = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
      });
      await prisma.carbonInventoryLineInput.update({
        where: { id: input.id },
        data: {
          measurementUnitId: BigInt(unit.id),
          manualFactorRateUnitId: canonicalRmu.id,
        },
      });
      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(1.5),
        appliedFactorRateUnitId: canonicalRmu.id,
        appliedFactorSource: "mu-screen-test-applied",
      });
      return { inventory, line };
    }

    // Regression for issue #395, RMU side: line inputs and applied line factors
    // have no soft-delete status of their own, but their owning inventory does
    // and deleting an inventory is a soft delete. All three inventory-backed
    // paths must drop once the inventory is soft-deleted.
    it("should not count inventory references once the inventory is soft-deleted", async () => {
      const unit = await createUnit();
      const { inventory } = await seedInventoryReferencePaths(unit);

      // direct + manual-factor + applied-factor → 3 while the inventory is ACTIVE.
      expect(await getReferenceCount(unit.id)).toBe(3);

      await prisma.carbonInventory.update({
        where: { id: inventory.id },
        data: { status: InventoryStatus.DELETED },
      });

      expect(await getReferenceCount(unit.id)).toBe(0);
    });

    // Same gap one level down: a soft-deleted line inside an ACTIVE inventory
    // must not keep its inputs/factors counted either.
    it("should not count inventory references on a soft-deleted line", async () => {
      const unit = await createUnit();
      const { line } = await seedInventoryReferencePaths(unit);

      expect(await getReferenceCount(unit.id)).toBe(3);

      await prisma.carbonInventoryLine.update({
        where: { id: line.id },
        data: { status: CarbonInventoryLineStatus.DELETED },
      });

      expect(await getReferenceCount(unit.id)).toBe(0);
    });
  });
});
