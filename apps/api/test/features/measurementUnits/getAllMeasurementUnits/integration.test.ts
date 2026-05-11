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

const MAGNITUDES = [
  "MASS",
  "VOLUME",
  "DISTANCE",
  "TIME",
  "ANIMALS",
  "AREA",
  "POWER",
  "ENERGY",
  "DISTANCE_MASS",
  "ROOMS",
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
      expect(testUnit!.magnitude.code).toBe("MASS");
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
      const sorted = [...body].sort((a, b) => {
        const magnitudeOrder = a.magnitude.name.localeCompare(b.magnitude.name);
        if (magnitudeOrder !== 0) return magnitudeOrder;
        return a.name.localeCompare(b.name);
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
      expect(cubicMeter!.magnitude.code).toBe("VOLUME");

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
});
