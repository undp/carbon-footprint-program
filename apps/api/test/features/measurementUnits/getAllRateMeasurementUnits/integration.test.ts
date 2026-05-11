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
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

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

      const testRateUnit = body.find((ru) => ru.name.includes("kg por litro"));
      expect(testRateUnit).toBeDefined();
      expect(testRateUnit!.name).toBe("kg por litro");
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
        "kg por gramo",
        "kg por kg",
        "kg por tonelada",
        "kg por kilómetro",
        "kg por milla",
        "kg por metro",
        "kg por litro",
        "kg por galón",
        "kg por metro cúbico",
        "kg por día",
        "kg por hora",
        "kg por animal",
        "kg por hectárea",
        "kg por megawatt",
        "kg por kilowatt",
        "kg por gigajoule",
        "kg por kiloómetro-hora",
        "kg por pieza arrendada",
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

      // Check kg por litro has correct nested units
      const kgPerLiter = body.find((ru) => ru.name === "kg por litro");
      expect(kgPerLiter).toBeDefined();
      expect(kgPerLiter!.numeratorUnit.name).toBe("kilógramo");
      expect(kgPerLiter!.numeratorUnit.magnitude.code).toBe("MASS");
      expect(kgPerLiter!.denominatorUnit.name).toBe("litro");
      expect(kgPerLiter!.denominatorUnit.magnitude.code).toBe("VOLUME");

      // Check kg por hora has correct nested units
      const kgPerHour = body.find((ru) => ru.name === "kg por hora");
      expect(kgPerHour).toBeDefined();
      expect(kgPerHour!.numeratorUnit.name).toBe("kilógramo");
      expect(kgPerHour!.numeratorUnit.magnitude.code).toBe("MASS");
      expect(kgPerHour!.denominatorUnit.name).toBe("hora");
      expect(kgPerHour!.denominatorUnit.magnitude.code).toBe("TIME");
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

      // All numerators should be MASS (kg)
      body.forEach((rateUnit) => {
        expect(rateUnit.numeratorUnit.magnitude.code).toBe("MASS");
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

      // Check for kg por metro cúbico which should have m3 in denominator
      const kgPerCubicMeter = body.find(
        (ru) => ru.name === "kg por metro cúbico"
      );
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
});
