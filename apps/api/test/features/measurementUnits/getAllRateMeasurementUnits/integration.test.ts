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
import {
  cleanupCarbonInventoryTestData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineFactor,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { createTestEmissionFactor } from "@test/factories/emissionFactorFactory.js";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  EmissionFactorStatus,
  InventoryStatus,
  Prisma,
  type PrismaClient,
} from "@repo/database";

describe("GET /api/measurement-units/rates - Integration Tests", () => {
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
    it("should return exactly 11 rate measurement units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      expect(body).toHaveLength(18);
    });

    it("should return rate measurement units with expected attributes", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      const testRateUnit = body.find((ru) => ru.name.includes("kg por L"));
      expect(testRateUnit).toBeDefined();
      expect(testRateUnit!.name).toBe("kg por L");
      expect(testRateUnit!.abbreviation).toBe("kg/L");
    });
  });

  describe("Rate measurement units", () => {
    it("should return all expected rate unit categories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      const expectedNames = [
        "kg por g",
        "kg por kg",
        "kg por ton",
        "kg por km",
        "kg por mi",
        "kg por m",
        "kg por L",
        "kg por gal",
        "kg por m3",
        "kg por d",
        "kg por h",
        "kg por cant anim",
        "kg por ha",
        "kg por MWh",
        "kg por kWh",
        "kg por GJ",
        "kg por km-ton",
        "kg por pieza arre",
      ];

      const actualNames = body.map((ru) => ru.name);
      expect(actualNames).toEqual(expect.arrayContaining(expectedNames));
    });
  });

  describe("Nested relationships", () => {
    it("should correctly link numerator and denominator units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      // Check kg por L has correct nested units
      const kgPerLiter = body.find((ru) => ru.name === "kg por L");
      expect(kgPerLiter).toBeDefined();
      expect(kgPerLiter!.numeratorUnit.name).toBe("kilógramos");
      expect(kgPerLiter!.numeratorUnit.magnitude.code).toBe("mass");
      expect(kgPerLiter!.denominatorUnit.name).toBe("litros");
      expect(kgPerLiter!.denominatorUnit.magnitude.code).toBe("volume");

      // Check kg por h has correct nested units
      const kgPerHour = body.find((ru) => ru.name === "kg por h");
      expect(kgPerHour).toBeDefined();
      expect(kgPerHour!.numeratorUnit.name).toBe("kilógramos");
      expect(kgPerHour!.numeratorUnit.magnitude.code).toBe("mass");
      expect(kgPerHour!.denominatorUnit.name).toBe("horas");
      expect(kgPerHour!.denominatorUnit.magnitude.code).toBe("time");
    });

    it("should have different magnitude combinations across rate units", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      // All numerators should be mass (kg)
      body.forEach((rateUnit) => {
        expect(rateUnit.numeratorUnit.magnitude.code).toBe("mass");
        expect(rateUnit.numeratorUnit.abbreviation).toBe("kg");
      });

      // Denominators should have different magnitudes
      const denominatorMagnitudes = new Set(
        body.map((ru) => ru.denominatorUnit.magnitude.code)
      );
      expect(denominatorMagnitudes.size).toBeGreaterThan(1);
    });
  });

  describe("Ordering", () => {
    it("should return rate measurement units ordered by name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      const names = body.map((ru) => ru.name);
      const sortedNames = [...names].sort();
      expect(names).toEqual(sortedNames);
    });
  });

  describe("Data integrity", () => {
    it("should correctly retrieve superscript characters in nested unit abbreviations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      // Check for kg por m3 which should have m3 in denominator
      const kgPerCubicMeter = body.find((ru) => ru.name === "kg por m3");
      expect(kgPerCubicMeter).toBeDefined();
      expect(kgPerCubicMeter!.denominatorUnit.abbreviation).toBe("m3");
      expect(kgPerCubicMeter!.denominatorUnit.abbreviation).toContain("3");
      expect(kgPerCubicMeter!.abbreviation).toContain("m3");

      // Ensure superscripts haven't been corrupted to ASCII equivalents
      body.forEach((rateUnit) => {
        expect(rateUnit.numeratorUnit.abbreviation).not.toMatch(/\^[0-9]/);
        expect(rateUnit.denominatorUnit.abbreviation).not.toMatch(/\^[0-9]/);
      });
    });

    it("should have unique IDs", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      const ids = body.map((ru) => ru.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have unique names", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      const names = body.map((ru) => ru.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });

    it("should have unique abbreviations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      const abbreviations = body.map((ru) => ru.abbreviation);
      const uniqueAbbreviations = new Set(abbreviations);

      expect(uniqueAbbreviations.size).toBe(abbreviations.length);
    });
  });

  describe("Reference counts and response shape", () => {
    afterEach(async () => {
      // Remove any references created during the test so subsequent tests
      // get a clean reference-count picture.
      await cleanupCarbonInventoryTestData(prisma);
      // Remove any test emission factors created during the test (others may
      // exist in seed data and are left alone).
      await prisma.emissionFactor.deleteMany({
        where: { source: { startsWith: "rmu-screen-test" } },
      });
    });

    it("returns referenceCounts and totalReferenceCount for each ACTIVE rate unit", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      expect(body.length).toBeGreaterThan(0);
      for (const item of body) {
        expect(item.referenceCounts).toBeDefined();
        expect(item.referenceCounts.emissionFactors).toBeGreaterThanOrEqual(0);
        expect(
          item.referenceCounts.lineFactorsAsApplied
        ).toBeGreaterThanOrEqual(0);
        expect(item.totalReferenceCount).toBe(
          item.referenceCounts.emissionFactors +
            item.referenceCounts.lineFactorsAsApplied
        );
      }
    });

    it("reports accurate per-category reference counts and totals", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );

      // Pick a rate unit deterministically (kg/L is a stable canonical RMU).
      const targetRateUnit = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: "kg/L" },
      });

      // Insert known counts of references against the target RMU.
      // emissionFactors: 2
      await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        targetRateUnit.id,
        { source: "rmu-screen-test-1" }
      );
      await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        targetRateUnit.id,
        { source: "rmu-screen-test-2" }
      );

      // Create a carbon inventory so we can add lines/inputs/factors.
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      // lineFactorsAsApplied: 3
      for (let i = 0; i < 3; i++) {
        const line = await createCarbonInventoryLine(
          prisma,
          inventory.id,
          subcategoryIds[0]
        );
        const input = await createCarbonInventoryLineInput(prisma, line.id, {
          inputType: "DIRECT",
          directTotalEmissions: new Prisma.Decimal(20),
        });
        await createCarbonInventoryLineFactor(prisma, input.id, {
          appliedFactorValue: new Prisma.Decimal(1.5),
          appliedFactorRateUnitId: targetRateUnit.id,
          appliedFactorSource: "rmu-screen-test-applied",
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      const targetItem = body.find(
        (i) => i.id === targetRateUnit.id.toString()
      );
      expect(targetItem).toBeDefined();
      expect(targetItem!.referenceCounts.emissionFactors).toBe(2);
      expect(targetItem!.referenceCounts.lineFactorsAsApplied).toBe(3);
      expect(targetItem!.totalReferenceCount).toBe(5);
    });

    // Emission factors are soft-deleted (status = DELETED) when their
    // subcategory is deleted. A DELETED factor must not keep its rate unit
    // counted as referenced.
    it("excludes soft-deleted emission factors from emissionFactors count", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );

      const targetRateUnit = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: "kg/L" },
      });

      // One ACTIVE, one DELETED emission factor on the same rate unit.
      await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        targetRateUnit.id,
        {
          source: "rmu-screen-test-active",
          status: EmissionFactorStatus.ACTIVE,
        }
      );
      await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        targetRateUnit.id,
        {
          source: "rmu-screen-test-deleted",
          status: EmissionFactorStatus.DELETED,
        }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;

      const targetItem = body.find(
        (i) => i.id === targetRateUnit.id.toString()
      );
      expect(targetItem).toBeDefined();
      // Only the ACTIVE factor counts.
      expect(targetItem!.referenceCounts.emissionFactors).toBe(1);
      expect(targetItem!.totalReferenceCount).toBe(1);
    });

    // Applied line factors have no soft-delete status of their own, but their
    // owning inventory does and deleting an inventory is a soft delete. A factor
    // on a soft-deleted inventory must not keep its rate unit counted (mirrors
    // the emission-factor case above and getReferenceCountsByMeasurementUnit).
    it("excludes applied line factors on a soft-deleted inventory from lineFactorsAsApplied count", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );

      const targetRateUnit = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: "kg/L" },
      });

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(20),
      });
      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(1.5),
        appliedFactorRateUnitId: targetRateUnit.id,
        appliedFactorSource: "rmu-screen-test-applied",
      });

      const countFor = async (): Promise<number> => {
        const response = await app.inject({
          method: "GET",
          url: "/api/measurement-units/rates",
        });
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(
          response.body
        ) as GetAllRateMeasurementUnitsResponse;
        const targetItem = body.find(
          (i) => i.id === targetRateUnit.id.toString()
        );
        expect(targetItem).toBeDefined();
        return targetItem!.referenceCounts.lineFactorsAsApplied;
      };

      // Active inventory → the applied factor counts.
      expect(await countFor()).toBe(1);

      // Soft-delete the inventory: the factor row survives but must stop counting.
      await prisma.carbonInventory.update({
        where: { id: inventory.id },
        data: { status: InventoryStatus.DELETED },
      });

      expect(await countFor()).toBe(0);
    });

    it("returns each joined numerator/denominator MU with its own magnitude object", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      expect(body.length).toBeGreaterThan(0);

      for (const item of body) {
        for (const magnitude of [
          item.numeratorUnit.magnitude,
          item.denominatorUnit.magnitude,
        ]) {
          expect(typeof magnitude.id).toBe("string");
          expect(typeof magnitude.code).toBe("string");
          expect(typeof magnitude.name).toBe("string");
          expect(typeof magnitude.isSystem).toBe("boolean");
          expect(typeof magnitude.status).toBe("string");
        }
      }
    });
  });
});
