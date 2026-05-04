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
  MeasurementUnitCreationResultEnum,
  type CreateMeasurementUnitResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MeasurementUnitStatus } from "@repo/database";

describe("POST /api/measurement-units - Integration Tests", () => {
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
    await prisma.subcategoryMeasurementUnit.deleteMany({
      where: { measurementUnit: { abbreviation: { startsWith: "test-" } } },
    });
    await prisma.rateMeasurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "kg/test-" } },
    });
    await prisma.measurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "test-" } },
    });
  });

  function buildPayload(overrides?: Record<string, unknown>) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      name: `Test Unit ${suffix}`,
      abbreviation: `test-${suffix}`,
      magnitude: "MASS",
      baseFactor: 500,
      isBase: false,
      ...overrides,
    };
  }

  describe("Successful creation", () => {
    it("should create a measurement unit and return 201", async () => {
      const payload = buildPayload();

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMeasurementUnitResponse;
      expect(body.id).toBeTruthy();
      expect(body.name).toBe(payload.name);
      expect(body.abbreviation).toBe(payload.abbreviation);
      expect(body.magnitude).toBe("MASS");
      expect(body.baseFactor).toBe(500);
      expect(body.isBase).toBe(false);
      expect(body.status).toBe(MeasurementUnitStatus.ACTIVE);
      expect(body.referenceCount).toBe(0);
      expect(body.action).toBe(MeasurementUnitCreationResultEnum.created);
    });

    it("should persist the unit and create a canonical RMU", async () => {
      const payload = buildPayload();

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMeasurementUnitResponse;

      const mu = await prisma.measurementUnit.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(mu).not.toBeNull();
      expect(mu!.status).toBe(MeasurementUnitStatus.ACTIVE);

      const canonicalRmu = await prisma.rateMeasurementUnit.findFirst({
        where: {
          abbreviation: `kg/${payload.abbreviation}`,
          denominatorMeasurementUnitId: BigInt(body.id),
        },
        include: { numeratorMeasurementUnit: true },
      });
      expect(canonicalRmu).not.toBeNull();
      expect(canonicalRmu!.numeratorMeasurementUnit.abbreviation).toBe("kg");
      expect(canonicalRmu!.status).toBe(MeasurementUnitStatus.ACTIVE);
    });
  });

  describe("Conflict handling", () => {
    it("should return 409 when abbreviation already exists (active)", async () => {
      const payload = buildPayload();

      await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MEASUREMENT_UNIT_ABBREVIATION_ALREADY_EXISTS");
    });

    it("should return 409 when isBase=true but magnitude already has a base unit", async () => {
      const payload = buildPayload({
        isBase: true,
        baseFactor: 1,
        magnitude: "MASS",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      // MASS already has a base unit (g) from seed data
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAGNITUDE_ALREADY_HAS_BASE_UNIT");
    });
  });

  describe("Restore behavior", () => {
    it("should restore a soft-deleted unit (action=fullyRestored) when referenceCount=0", async () => {
      const payload = buildPayload();

      // Create then delete the unit directly via DB
      const createResponse = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });
      const created = JSON.parse(
        createResponse.body
      ) as CreateMeasurementUnitResponse;

      await prisma.measurementUnit.update({
        where: { id: BigInt(created.id) },
        data: { status: MeasurementUnitStatus.DELETED },
      });
      // Mirror the real cascade from deleteMeasurementUnitService: soft-delete
      // the canonical RMU as well, so the restore path flips it back to ACTIVE.
      await prisma.rateMeasurementUnit.updateMany({
        where: { denominatorMeasurementUnitId: BigInt(created.id) },
        data: { status: MeasurementUnitStatus.DELETED },
      });

      // Re-create with same abbreviation but different name and magnitude
      const restorePayload = {
        ...payload,
        name: `Restored ${payload.name}`,
        magnitude: "VOLUME",
        baseFactor: 999,
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: restorePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMeasurementUnitResponse;
      expect(body.action).toBe(MeasurementUnitCreationResultEnum.fullyRestored);
      expect(body.id).toBe(created.id); // same row, restored
      expect(body.name).toBe(restorePayload.name);
      expect(body.magnitude).toBe("VOLUME");
      expect(body.baseFactor).toBe(999);
      expect(body.status).toBe(MeasurementUnitStatus.ACTIVE);

      const canonicalRmu = await prisma.rateMeasurementUnit.findFirst({
        where: { denominatorMeasurementUnitId: BigInt(created.id) },
      });
      expect(canonicalRmu).not.toBeNull();
      expect(canonicalRmu!.status).toBe(MeasurementUnitStatus.ACTIVE);
      expect(canonicalRmu!.abbreviation).toBe(`kg/${payload.abbreviation}`);
    });

    it("should restore only labels (action=restoredLabelsOnly) when referenceCount>0", async () => {
      const payload = buildPayload();

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });
      const created = JSON.parse(
        createResponse.body
      ) as CreateMeasurementUnitResponse;

      // Create a reference so the restore path takes the labels-only branch.
      const subcategory = await prisma.subcategory.findFirst({
        select: { id: true },
      });
      if (!subcategory) {
        return;
      }
      await prisma.subcategoryMeasurementUnit.create({
        data: {
          subcategoryId: subcategory.id,
          measurementUnitId: BigInt(created.id),
        },
      });

      await prisma.measurementUnit.update({
        where: { id: BigInt(created.id) },
        data: { status: MeasurementUnitStatus.DELETED },
      });
      await prisma.rateMeasurementUnit.updateMany({
        where: { denominatorMeasurementUnitId: BigInt(created.id) },
        data: { status: MeasurementUnitStatus.DELETED },
      });

      const restorePayload = {
        ...payload,
        name: `Restored ${payload.name}`,
        magnitude: "VOLUME",
        baseFactor: 999,
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: restorePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMeasurementUnitResponse;
      expect(body.action).toBe(
        MeasurementUnitCreationResultEnum.restoredLabelsOnly
      );
      expect(body.id).toBe(created.id);
      expect(body.name).toBe(restorePayload.name);
      expect(body.abbreviation).toBe(payload.abbreviation);
      // Structural fields must remain unchanged in the labels-only branch.
      expect(body.magnitude).toBe(payload.magnitude);
      expect(body.baseFactor).toBe(payload.baseFactor);
      expect(body.isBase).toBe(payload.isBase);
      expect(body.status).toBe(MeasurementUnitStatus.ACTIVE);
      expect(body.referenceCount).toBeGreaterThan(0);
    });
  });

  describe("Validation", () => {
    it("should return 400 for missing required fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: { name: "incomplete" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for non-positive baseFactor", async () => {
      const payload = buildPayload({ baseFactor: 0 });

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
