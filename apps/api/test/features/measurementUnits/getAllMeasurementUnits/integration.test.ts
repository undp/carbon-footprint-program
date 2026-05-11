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
import type { GetAllMeasurementUnitsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MagnitudeStatus, MeasurementUnitStatus } from "@repo/database";

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
      expect(testUnit!.name).toBe("kilógramo");
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
    it("should return units ordered by magnitude & name", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMeasurementUnitsResponse;
      // Postgres orders by code-point (binary) under the default UTF-8
      // collation: accented Latin chars like `Á` (U+00C1) come after `V`
      // (U+0056), not next to `A` as `localeCompare()` would place them.
      // Mirror the same comparison here so the expected order matches the
      // server's response.
      const byCodePoint = (a: string, b: string) =>
        a < b ? -1 : a > b ? 1 : 0;
      const sorted = [...body].sort((a, b) => {
        const magnitudeOrder = byCodePoint(a.magnitude.name, b.magnitude.name);
        if (magnitudeOrder !== 0) return magnitudeOrder;
        return byCodePoint(a.name, b.name);
      });
      expect(body).toEqual(sorted);
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
});
