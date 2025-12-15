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
import type { GetAllRateMeasurementUnitsResponse } from "@/features/measurementUnits/getAllRateMeasurementUnits/getAllRateMeasurementUnitsSchema.js";
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

  beforeEach(async () => {
    await prisma.$executeRawUnsafe("BEGIN");
  });

  afterEach(async () => {
    await prisma.$executeRawUnsafe("ROLLBACK");
  });

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
      expect(body).toHaveLength(11);
    });

    it("should return rate measurement units with valid structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/measurement-units/rates",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllRateMeasurementUnitsResponse;
      expect(Array.isArray(body)).toBe(true);

      if (body.length > 0) {
        body.forEach((rateUnit) => {
          expect(rateUnit).toHaveProperty("id");
          expect(rateUnit).toHaveProperty("name");
          expect(rateUnit).toHaveProperty("abbreviation");
          expect(rateUnit).toHaveProperty("numerator_unit");
          expect(rateUnit).toHaveProperty("denominator_unit");

          expect(typeof rateUnit.id).toBe("string");
          expect(typeof rateUnit.name).toBe("string");
          expect(typeof rateUnit.abbreviation).toBe("string");

          // Validate numerator unit
          expect(rateUnit.numerator_unit).toHaveProperty("id");
          expect(rateUnit.numerator_unit).toHaveProperty("name");
          expect(rateUnit.numerator_unit).toHaveProperty("magnitude");
          expect(rateUnit.numerator_unit).toHaveProperty("abbreviation");

          // Validate denominator unit
          expect(rateUnit.denominator_unit).toHaveProperty("id");
          expect(rateUnit.denominator_unit).toHaveProperty("name");
          expect(rateUnit.denominator_unit).toHaveProperty("magnitude");
          expect(rateUnit.denominator_unit).toHaveProperty("abbreviation");
        });
      }
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
      expect(testRateUnit?.name).toBe("kg por litro");
      expect(testRateUnit?.abbreviation).toBe("kg/L");
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
        "kg por metro",
        "kg por centímetro",
        "kg por litro",
        "kg por metro cúbico",
        "kg por segundo",
        "kg por minuto",
        "kg por hora",
      ];

      expectedNames.forEach((expectedName) => {
        const found = body.find((ru) => ru.name === expectedName);
        expect(found).toBeDefined();
      });
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
      expect(kgPerLiter?.numerator_unit.name).toBe("Kilogramo");
      expect(kgPerLiter?.numerator_unit.magnitude).toBe("MASS");
      expect(kgPerLiter?.denominator_unit.name).toBe("Litro");
      expect(kgPerLiter?.denominator_unit.magnitude).toBe("VOLUME");

      // Check kg por hora has correct nested units
      const kgPerHour = body.find((ru) => ru.name === "kg por hora");
      expect(kgPerHour).toBeDefined();
      expect(kgPerHour?.numerator_unit.name).toBe("Kilogramo");
      expect(kgPerHour?.numerator_unit.magnitude).toBe("MASS");
      expect(kgPerHour?.denominator_unit.name).toBe("Hora");
      expect(kgPerHour?.denominator_unit.magnitude).toBe("TIME");
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
        expect(rateUnit.numerator_unit.magnitude).toBe("MASS");
        expect(rateUnit.numerator_unit.abbreviation).toBe("kg");
      });

      // Denominators should have different magnitudes
      const denominatorMagnitudes = new Set(
        body.map((ru) => ru.denominator_unit.magnitude)
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

      // Check for kg por metro cúbico which should have m³ in denominator
      const kgPerCubicMeter = body.find(
        (ru) => ru.name === "kg por metro cúbico"
      );
      if (kgPerCubicMeter) {
        expect(kgPerCubicMeter.denominator_unit.abbreviation).toBe("m³");
        expect(kgPerCubicMeter.denominator_unit.abbreviation).toContain("³");
        expect(kgPerCubicMeter.abbreviation).toContain("m³");
      }

      // Ensure superscripts haven't been corrupted to ASCII equivalents
      body.forEach((rateUnit) => {
        expect(rateUnit.numerator_unit.abbreviation).not.toMatch(/\^[0-9]/);
        expect(rateUnit.denominator_unit.abbreviation).not.toMatch(/\^[0-9]/);
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
