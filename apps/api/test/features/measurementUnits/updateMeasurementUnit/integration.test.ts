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
import type {
  CreateMeasurementUnitResponse,
  UpdateMeasurementUnitResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MeasurementUnitStatus } from "@repo/database";

describe("PATCH /api/measurement-units/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.rateMeasurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "kg/test-" } },
    });
    await prisma.measurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "test-" } },
    });
  });

  async function createUnit(
    overrides?: Record<string, unknown>
  ): Promise<CreateMeasurementUnitResponse> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      name: `Test Unit ${suffix}`,
      abbreviation: `test-${suffix}`,
      magnitude: "MASS",
      baseFactor: 500,
      isBase: false,
      ...overrides,
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/measurement-units",
      payload,
    });
    return JSON.parse(response.body) as CreateMeasurementUnitResponse;
  }

  describe("Successful update", () => {
    it("should rename a unit and cascade to its canonical RMU", async () => {
      const created = await createUnit();
      const newAbbr = `test-${Date.now()}-renamed`;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { name: "Renamed Unit", abbreviation: newAbbr },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.name).toBe("Renamed Unit");
      expect(body.abbreviation).toBe(newAbbr);

      // Verify canonical RMU was updated
      const canonicalRmu = await prisma.rateMeasurementUnit.findFirst({
        where: {
          abbreviation: `kg/${newAbbr}`,
          denominatorMeasurementUnitId: BigInt(created.id),
        },
      });
      expect(canonicalRmu).not.toBeNull();
      expect(canonicalRmu!.name).toBe("kg por Renamed Unit");
    });

    it("should update magnitude and baseFactor when referenceCount is 0", async () => {
      const created = await createUnit({ magnitude: "MASS", baseFactor: 100 });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { magnitude: "VOLUME", baseFactor: 999 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.magnitude).toBe("VOLUME");
      expect(body.baseFactor).toBe(999);
    });
  });

  describe("Protected rows", () => {
    it("should return 422 for the kg unit", async () => {
      const kgUnit = await prisma.measurementUnit.findUnique({
        where: { abbreviation: "kg" },
      });
      expect(kgUnit).not.toBeNull();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${kgUnit!.id}`,
        payload: { name: "New name" },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("KG_MEASUREMENT_UNIT_IMMUTABLE");
    });

    it("should return 422 for a base unit", async () => {
      const baseUnit = await prisma.measurementUnit.findFirst({
        where: { isBase: true, abbreviation: { not: "kg" } },
      });
      expect(baseUnit).not.toBeNull();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${baseUnit!.id}`,
        payload: { name: "New name" },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("BASE_UNIT_IMMUTABLE");
    });
  });

  describe("Locked fields", () => {
    it("should return 422 when trying to change magnitude on a referenced unit", async () => {
      const created = await createUnit();

      // Simulate a reference by creating a subcategoryMeasurementUnit entry
      const subcategory = await prisma.subcategory.findFirst({
        select: { id: true },
      });
      if (!subcategory) {
        // Skip if no subcategory exists in this test DB
        return;
      }

      await prisma.subcategoryMeasurementUnit.create({
        data: {
          subcategoryId: subcategory.id,
          measurementUnitId: BigInt(created.id),
        },
      });

      try {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/measurement-units/${created.id}`,
          payload: { magnitude: "VOLUME" },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as { code: string };
        expect(body.code).toBe("MEASUREMENT_UNIT_FIELDS_LOCKED");
      } finally {
        await prisma.subcategoryMeasurementUnit.deleteMany({
          where: { measurementUnitId: BigInt(created.id) },
        });
      }
    });

    it("should return 422 when trying to toggle isBase", async () => {
      const created = await createUnit({ isBase: false });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { isBase: true },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("BASE_UNIT_TOGGLE_NOT_ALLOWED");
    });
  });

  describe("Conflict handling", () => {
    it("should return 409 when renaming to an existing abbreviation", async () => {
      const unit1 = await createUnit();
      const unit2 = await createUnit();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${unit1.id}`,
        payload: { abbreviation: unit2.abbreviation },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MEASUREMENT_UNIT_ABBREVIATION_ALREADY_EXISTS");
    });
  });

  describe("Not found", () => {
    it("should return 404 for an unknown id", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/measurement-units/999999999",
        payload: { name: "Does not matter" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 for a soft-deleted unit", async () => {
      const created = await createUnit();
      await prisma.measurementUnit.update({
        where: { id: BigInt(created.id) },
        data: { status: MeasurementUnitStatus.DELETED },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { name: "Too late" },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
