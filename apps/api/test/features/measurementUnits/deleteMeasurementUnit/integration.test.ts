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
import type { CreateMeasurementUnitResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MeasurementUnitStatus, SubcategoryStatus } from "@repo/database";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";

describe("DELETE /api/measurement-units/:id - Integration Tests", () => {
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
    if (!magnitudeIdByCode.mass) {
      throw new Error(
        "required magnitude 'mass' not found in seed data. Ensure the database seed has been applied before running this suite."
      );
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Links reference both the subcategory and the unit, so drop them first.
    await prisma.subcategoryMeasurementUnit.deleteMany({
      where: { subcategory: { name: { startsWith: "Test - Subcategory" } } },
    });
    await prisma.subcategory.deleteMany({
      where: { name: { startsWith: "Test - Subcategory" } },
    });
    // Re-activate any soft-deleted test units so other tests don't fail
    await prisma.rateMeasurementUnit.updateMany({
      where: { abbreviation: { startsWith: "kg/test-" } },
      data: { status: MeasurementUnitStatus.ACTIVE },
    });
    await prisma.measurementUnit.updateMany({
      where: { abbreviation: { startsWith: "test-" } },
      data: { status: MeasurementUnitStatus.ACTIVE },
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
    const payload = {
      name: `Test Unit ${suffix}`,
      abbreviation: `test-${suffix}`,
      magnitudeId: magnitudeIdByCode.mass,
      baseFactor: 500,
      isBase: false,
    };
    const response = await app.inject({
      method: "POST",
      url: "/api/measurement-units",
      payload,
    });
    expect(response.statusCode).toBe(201);
    return JSON.parse(response.body) as CreateMeasurementUnitResponse;
  }

  describe("Happy path", () => {
    it("should soft-delete a unit and return 200", async () => {
      const created = await createUnit();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should soft-delete the canonical RMU as well", async () => {
      const created = await createUnit();

      await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      const mu = await prisma.measurementUnit.findUnique({
        where: { id: BigInt(created.id) },
      });
      expect(mu!.status).toBe(MeasurementUnitStatus.DELETED);

      const canonicalRmu = await prisma.rateMeasurementUnit.findFirst({
        where: {
          abbreviation: `kg/${created.abbreviation}`,
          denominatorMeasurementUnitId: BigInt(created.id),
        },
      });
      expect(canonicalRmu).not.toBeNull();
      expect(canonicalRmu!.status).toBe(MeasurementUnitStatus.DELETED);
    });

    it("should no longer appear in GET /api/measurement-units after deletion", async () => {
      const created = await createUnit();

      await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      const listResponse = await app.inject({
        method: "GET",
        url: "/api/measurement-units",
      });

      expect(listResponse.statusCode).toBe(200);
      const units = JSON.parse(listResponse.body) as Array<{ id: string }>;
      const found = units.find((u) => u.id === created.id);
      expect(found).toBeUndefined();
    });
  });

  describe("Protected rows", () => {
    it("should return 422 for the kg unit", async () => {
      const kgUnit = await prisma.measurementUnit.findUnique({
        where: { abbreviation: "kg" },
      });
      expect(kgUnit).not.toBeNull();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${kgUnit!.id}`,
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
        method: "DELETE",
        url: `/api/measurement-units/${baseUnit!.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("BASE_UNIT_IMMUTABLE");
    });
  });

  describe("Referenced units", () => {
    // The delete guard shares getReferenceCount with the list endpoint and the
    // edit guard, so a unit the UI shows as "in use" cannot be deleted via the
    // API either.
    it("should return 422 when the unit is referenced by existing data", async () => {
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

      const response = await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MEASUREMENT_UNIT_REFERENCED");

      // The unit stays ACTIVE: the delete was rejected, not partially applied.
      const mu = await prisma.measurementUnit.findUnique({
        where: { id: BigInt(created.id) },
      });
      expect(mu!.status).toBe(MeasurementUnitStatus.ACTIVE);
    });

    // Counterpart to the soft-delete fix: a reference under a soft-deleted
    // subcategory is not a real reference, so the unit is deletable again.
    it("should soft-delete when the only reference is under a soft-deleted subcategory", async () => {
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
      await prisma.subcategory.update({
        where: { id: subcategory.id },
        data: { status: SubcategoryStatus.DELETED },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      expect(response.statusCode).toBe(200);
      const mu = await prisma.measurementUnit.findUnique({
        where: { id: BigInt(created.id) },
      });
      expect(mu!.status).toBe(MeasurementUnitStatus.DELETED);
    });
  });

  describe("Not found", () => {
    it("should return 404 for an unknown id", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/measurement-units/999999999",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when trying to delete an already soft-deleted unit", async () => {
      const created = await createUnit();

      // First delete
      await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      // Second delete should 404 (idempotent-not-found)
      const response = await app.inject({
        method: "DELETE",
        url: `/api/measurement-units/${created.id}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
