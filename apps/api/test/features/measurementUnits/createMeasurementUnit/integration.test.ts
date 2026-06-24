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
import {
  MagnitudeStatus,
  MeasurementUnitStatus,
  SubcategoryStatus,
} from "@repo/database";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";

describe("POST /api/measurement-units - Integration Tests", () => {
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
    const requiredCodes = ["mass", "volume"];
    const missing = requiredCodes.filter((c) => !magnitudeIdByCode[c]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required seed magnitudes: ${missing.join(", ")}. Ensure the database seed has been applied before running this suite.`
      );
    }
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
    await prisma.subcategory.deleteMany({
      where: { name: { startsWith: "Test - Subcategory" } },
    });
  });

  function buildPayload(overrides?: Record<string, unknown>) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    return {
      name: `Test Unit ${suffix}`,
      abbreviation: `test-${suffix}`,
      magnitudeId: magnitudeIdByCode.mass,
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
      expect(body.magnitudeId).toBe(magnitudeIdByCode.mass);
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
        magnitudeId: magnitudeIdByCode.mass,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });

      // mass already has a base unit (g) from seed data
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
        magnitudeId: magnitudeIdByCode.volume,
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
      expect(body.magnitudeId).toBe(magnitudeIdByCode.volume);
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
        throw new Error(
          "Test precondition failed: no Subcategory found in the seeded test database. " +
            "The restoredLabelsOnly branch requires at least one subcategory to create a SubcategoryMeasurementUnit reference."
        );
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
        magnitudeId: magnitudeIdByCode.volume,
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
      expect(body.magnitudeId).toBe(payload.magnitudeId);
      expect(body.baseFactor).toBe(payload.baseFactor);
      expect(body.isBase).toBe(payload.isBase);
      expect(body.status).toBe(MeasurementUnitStatus.ACTIVE);
      expect(body.referenceCount).toBeGreaterThan(0);
    });

    // Regression for issue #395: a reference under a soft-deleted subcategory is
    // not a real reference, so the restore must take the fullyRestored branch.
    // This shares the same getReferenceCount as the list endpoint, so it would
    // have wrongly taken restoredLabelsOnly before the soft-delete fix.
    it("should fully restore when the only reference is under a soft-deleted subcategory", async () => {
      const payload = buildPayload();

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload,
      });
      const created = JSON.parse(
        createResponse.body
      ) as CreateMeasurementUnitResponse;

      // Reference the unit from a fresh subcategory, then soft-delete that
      // subcategory: the join row survives but must no longer count.
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

      // Soft-delete the unit + canonical RMU (mirrors deleteMeasurementUnitService).
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
        magnitudeId: magnitudeIdByCode.volume,
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
      expect(body.magnitudeId).toBe(magnitudeIdByCode.volume);
      expect(body.baseFactor).toBe(999);
      expect(body.referenceCount).toBe(0);
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

    it("should return 400 for negative baseFactor", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ baseFactor: -1 }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when baseFactor is null", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ baseFactor: null }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when baseFactor is a string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ baseFactor: "500" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for a missing magnitudeId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ magnitudeId: undefined }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when abbreviation contains a slash", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ abbreviation: "test-with/slash" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when abbreviation contains a control character", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ abbreviation: "test--ctrl" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when abbreviation is empty after trim", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ abbreviation: "   " }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when abbreviation exceeds the max length", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ abbreviation: `test-${"x".repeat(40)}` }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name exceeds the max length", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/measurement-units",
        payload: buildPayload({ name: "x".repeat(101) }),
      });
      expect(response.statusCode).toBe(400);
    });

    // The create endpoint must refuse measurement units that reference a
    // soft-deleted magnitude. The chosen enforcement layer is service-level
    // validation (the route schema only validates id shape, not DB state),
    // so this test expects a 400 returned from the service.
    it("should return 400 when magnitudeId references a DELETED magnitude", async () => {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const deletedMagnitude = await prisma.magnitude.create({
        data: {
          code: `test_${suffix}`,
          name: `Test Deleted Magnitude ${suffix}`,
          isSystem: false,
          status: MagnitudeStatus.DELETED,
        },
      });

      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/measurement-units",
          payload: buildPayload({
            magnitudeId: deletedMagnitude.id.toString(),
          }),
        });
        expect(response.statusCode).toBe(400);
      } finally {
        // Tear down any MU that may have been created against this magnitude
        // before deleting the magnitude row (FK is ON DELETE RESTRICT).
        const orphans = await prisma.measurementUnit.findMany({
          where: { magnitudeId: deletedMagnitude.id },
          select: { id: true },
        });
        if (orphans.length > 0) {
          const orphanIds = orphans.map((o) => o.id);
          await prisma.rateMeasurementUnit.deleteMany({
            where: {
              OR: [
                { numeratorMeasurementUnitId: { in: orphanIds } },
                { denominatorMeasurementUnitId: { in: orphanIds } },
              ],
            },
          });
          await prisma.measurementUnit.deleteMany({
            where: { id: { in: orphanIds } },
          });
        }
        await prisma.magnitude.delete({ where: { id: deletedMagnitude.id } });
      }
    });
  });
});
