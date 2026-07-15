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
import {
  EmissionFactorStatus,
  MagnitudeStatus,
  MeasurementUnitStatus,
  SubcategoryStatus,
} from "@repo/database";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import { createTestEmissionFactor } from "@test/factories/emissionFactorFactory.js";

describe("PATCH /api/measurement-units/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  const magnitudeIdByCode: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    const magnitudes = await prisma.magnitude.findMany({
      select: { id: true, code: true },
    });
    for (const m of magnitudes) {
      magnitudeIdByCode[m.code] = m.id.toString();
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.emissionFactor.deleteMany({
      where: { source: { startsWith: "mu-update-test" } },
    });
    await prisma.subcategoryMeasurementUnit.deleteMany({
      where: { measurementUnit: { abbreviation: { startsWith: "test-" } } },
    });
    await prisma.rateMeasurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "kg/test-" } },
    });
    await prisma.measurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "test-" } },
    });
    await prisma.subcategory.deleteMany({
      where: { name: { startsWith: "Test - Subcategory" } },
    });
  });

  async function createUnit(
    overrides?: Record<string, unknown>
  ): Promise<CreateMeasurementUnitResponse> {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      name: `Test Unit ${suffix}`,
      abbreviation: `test-${suffix}`,
      magnitudeId: magnitudeIdByCode.mass,
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
      expect(canonicalRmu!.name).toBe(`kg por ${newAbbr}`);
    });

    it("should update magnitude and baseFactor when referenceCount is 0", async () => {
      const created = await createUnit({
        magnitudeId: magnitudeIdByCode.mass,
        baseFactor: 100,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: {
          magnitudeId: magnitudeIdByCode.volume,
          baseFactor: 999,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.magnitudeId).toBe(magnitudeIdByCode.volume);
      expect(body.baseFactor).toBe(999);
    });

    it("should update baseFactor alone without touching magnitude or abbreviation", async () => {
      const created = await createUnit({ baseFactor: 100 });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { baseFactor: 250 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.baseFactor).toBe(250);
      expect(body.magnitudeId).toBe(magnitudeIdByCode.mass);
    });

    it("should be a no-op when every field is explicitly re-sent with its current value", async () => {
      const created = await createUnit({
        magnitudeId: magnitudeIdByCode.mass,
        baseFactor: 321,
        isBase: false,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: {
          name: created.name,
          abbreviation: created.abbreviation,
          magnitudeId: created.magnitudeId,
          baseFactor: created.baseFactor,
          isBase: created.isBase,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.magnitudeId).toBe(created.magnitudeId);
      expect(body.baseFactor).toBe(created.baseFactor);
      expect(body.isBase).toBe(created.isBase);
    });
  });

  describe("baseFactor=1 reservation for base units", () => {
    async function createFreshMagnitude() {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return prisma.magnitude.create({
        data: {
          code: `test_upd_fresh_${suffix}`,
          name: `Test Update Fresh Magnitude ${suffix}`,
          isSystem: false,
          status: MagnitudeStatus.ACTIVE,
        },
      });
    }

    it("should pass the 'no existing base unit' guard and hit the DB check constraint when setting baseFactor=1 on a non-base unit", async () => {
      // As in the analogous create-endpoint test: with no existing base unit
      // for the magnitude, the `if (existingBase)` guard evaluates false and
      // the update proceeds — where the `measurement_unit_base_factor_check`
      // constraint unconditionally rejects baseFactor=1 for a non-base unit.
      // This still exercises the guard's "not found" branch.
      const magnitude = await createFreshMagnitude();
      try {
        const created = await createUnit({
          magnitudeId: magnitude.id.toString(),
          baseFactor: 500,
        });

        const response = await app.inject({
          method: "PATCH",
          url: `/api/measurement-units/${created.id}`,
          payload: { baseFactor: 1 },
        });

        expect(response.statusCode).toBe(500);
      } finally {
        await prisma.rateMeasurementUnit.deleteMany({
          where: { denominatorMeasurementUnit: { magnitudeId: magnitude.id } },
        });
        await prisma.measurementUnit.deleteMany({
          where: { magnitudeId: magnitude.id },
        });
        await prisma.magnitude.delete({ where: { id: magnitude.id } });
      }
    });

    it("should return 422 when moving to a magnitude (via magnitudeId) that already has a base unit, combined with baseFactor=1", async () => {
      const magnitude = await createFreshMagnitude();
      try {
        const created = await createUnit({
          magnitudeId: magnitude.id.toString(),
          baseFactor: 500,
        });

        // "mass" already has a base unit (g) from seed data.
        const response = await app.inject({
          method: "PATCH",
          url: `/api/measurement-units/${created.id}`,
          payload: {
            magnitudeId: magnitudeIdByCode.mass,
            baseFactor: 1,
          },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as { code: string };
        expect(body.code).toBe("BASE_FACTOR_ONE_RESERVED_FOR_BASE_UNIT");
      } finally {
        await prisma.rateMeasurementUnit.deleteMany({
          where: { denominatorMeasurementUnit: { magnitudeId: magnitude.id } },
        });
        await prisma.measurementUnit.deleteMany({
          where: { magnitudeId: magnitude.id },
        });
        await prisma.magnitude.delete({ where: { id: magnitude.id } });
      }
    });
  });

  describe("Data integrity", () => {
    it("should throw a data integrity error when the canonical RMU row is missing during a rename", async () => {
      const created = await createUnit();
      // Delete the canonical RMU row entirely (rather than soft-deleting it),
      // simulating a data-integrity anomaly the rename path must guard against.
      await prisma.rateMeasurementUnit.deleteMany({
        where: { denominatorMeasurementUnitId: BigInt(created.id) },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { name: "Renamed after RMU loss" },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DATA_INTEGRITY_ERROR");
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

    it("should allow name-only update on a base unit", async () => {
      const baseUnit = await prisma.measurementUnit.findFirst({
        where: { isBase: true, abbreviation: { not: "kg" } },
      });
      expect(baseUnit).not.toBeNull();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${baseUnit!.id}`,
        payload: { name: "New name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.name).toBe("New name");

      // Restore original name
      await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${baseUnit!.id}`,
        payload: { name: baseUnit!.name },
      });
    });

    it("should return 422 when trying to change structural fields on a base unit", async () => {
      const baseUnit = await prisma.measurementUnit.findFirst({
        where: { isBase: true, abbreviation: { not: "kg" } },
      });
      expect(baseUnit).not.toBeNull();

      // Pick a magnitude different from the base unit's current one
      const differentMagnitudeId =
        baseUnit!.magnitudeId.toString() === magnitudeIdByCode.volume
          ? magnitudeIdByCode.distance
          : magnitudeIdByCode.volume;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${baseUnit!.id}`,
        payload: { magnitudeId: differentMagnitudeId },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MEASUREMENT_UNIT_FIELDS_LOCKED");
    });
  });

  describe("Locked fields", () => {
    it("should return 422 when trying to change magnitude on a referenced unit", async () => {
      const created = await createUnit();

      // Simulate a reference by creating a subcategoryMeasurementUnit entry
      const subcategory = await prisma.subcategory.findFirst({
        select: { id: true },
      });
      expect(subcategory).not.toBeNull();

      await prisma.subcategoryMeasurementUnit.create({
        data: {
          subcategoryId: subcategory!.id,
          measurementUnitId: BigInt(created.id),
        },
      });

      try {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/measurement-units/${created.id}`,
          payload: { magnitudeId: magnitudeIdByCode.volume },
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

  describe("Magnitude state", () => {
    // The update endpoint must refuse re-pointing an MU at a soft-deleted
    // magnitude. Enforcement is service-level (the route schema only
    // validates id shape, not DB state), so this test expects a 400.
    it("should return 400 when magnitudeId references a DELETED magnitude", async () => {
      const created = await createUnit();
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const deletedMagnitude = await prisma.magnitude.create({
        data: {
          code: `test_${suffix}`,
          name: `Test Deleted ${suffix}`,
          isSystem: false,
          status: MagnitudeStatus.DELETED,
        },
      });

      try {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/measurement-units/${created.id}`,
          payload: { magnitudeId: deletedMagnitude.id.toString() },
        });
        expect(response.statusCode).toBe(400);
      } finally {
        // Reassign the MU off the DELETED magnitude before tearing it down,
        // in case the service accepted the request (FK is ON DELETE RESTRICT).
        const orphans = await prisma.measurementUnit.findMany({
          where: { magnitudeId: deletedMagnitude.id },
          select: { id: true },
        });
        if (orphans.length > 0) {
          await prisma.measurementUnit.updateMany({
            where: { id: { in: orphans.map((o) => o.id) } },
            data: { magnitudeId: BigInt(magnitudeIdByCode.mass) },
          });
        }
        await prisma.magnitude.delete({ where: { id: deletedMagnitude.id } });
      }
    });
  });

  describe("Reference guard ignores soft-deleted dependents", () => {
    // The field-lock guard must use the same reference count as the list
    // endpoint. A unit whose only references are soft-deleted is NOT in use, so
    // its structural fields must stay editable (the counterpart of "should
    // return 422 ... on a referenced unit" above, which proves an ACTIVE
    // reference still locks).
    it("should allow a magnitude change when the only subcategory link is soft-deleted", async () => {
      const created = await createUnit();
      const category = await prisma.category.findFirstOrThrow({
        select: { id: true },
      });
      const subcategory = await createTestSubcategory(prisma, category.id);
      await prisma.subcategoryMeasurementUnit.create({
        data: {
          subcategoryId: subcategory.id,
          measurementUnitId: BigInt(created.id),
        },
      });

      // Soft-delete the subcategory: the join row survives but must stop counting.
      await prisma.subcategory.update({
        where: { id: subcategory.id },
        data: { status: SubcategoryStatus.DELETED },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { magnitudeId: magnitudeIdByCode.volume },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.magnitudeId).toBe(magnitudeIdByCode.volume);
      expect(body.referenceCount).toBe(0);
    });

    it("should allow a magnitude change when the only emission factor is soft-deleted", async () => {
      const created = await createUnit();
      const canonicalRmu = await prisma.rateMeasurementUnit.findFirstOrThrow({
        where: { abbreviation: `kg/${created.abbreviation}` },
      });
      const subcategory = await prisma.subcategory.findFirstOrThrow({
        select: { id: true },
      });
      await createTestEmissionFactor(prisma, subcategory.id, canonicalRmu.id, {
        source: "mu-update-test-deleted",
        status: EmissionFactorStatus.DELETED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/measurement-units/${created.id}`,
        payload: { magnitudeId: magnitudeIdByCode.volume },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMeasurementUnitResponse;
      expect(body.magnitudeId).toBe(magnitudeIdByCode.volume);
      expect(body.referenceCount).toBe(0);
    });
  });
});
