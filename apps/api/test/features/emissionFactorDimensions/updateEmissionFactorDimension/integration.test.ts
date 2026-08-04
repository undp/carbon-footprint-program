import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import {
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";
import type { UpdateEmissionFactorDimensionResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { updateEmissionFactorDimensionService } from "@/features/emissionFactorDimensions/updateEmissionFactorDimension/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

describe("PATCH /api/emission-factor-dimensions/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  async function buildTestDimension(overrides?: {
    position?: number;
    isRequired?: boolean;
  }) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - For Dimension Update",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Update Dim Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Update Dim Subcategory",
    });
    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      {
        position: overrides?.position ?? 1,
        isRequired: overrides?.isRequired ?? false,
      }
    );
    const value = await createTestEmissionFactorDimensionValue(
      prisma,
      dimension.id,
      { value: "Initial Value" }
    );
    return { methodology, category, subcategory, dimension, value };
  }

  describe("Successful updates", () => {
    it("should update dimension name", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: { name: "Updated Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.name).toBe("Updated Name");
    });

    it("should update isRequired flag", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: { isRequired: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.isRequired).toBe(true);
    });

    it("should add new values", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { add: ["New Value 1", "New Value 2"] },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.values).toHaveLength(3); // Initial + 2 new
    });

    it("should remove values and set EF FK to null for non-required dimension", async () => {
      const { dimension, value, subcategory } = await buildTestDimension({
        isRequired: false,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      // Create an emission factor referencing this value
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { dimensionValue1Id: value.id }
      );

      // Add another value so we don't drop below 1
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Backup Value",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [value.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.values).toHaveLength(1);
      expect(body.values[0].value).toBe("Backup Value");

      const updatedValue = await prisma.emissionFactorDimensionValue.findUnique(
        {
          where: { id: value.id },
        }
      );
      expect(updatedValue!.status).toBe(
        EmissionFactorDimensionValueStatus.DELETED
      );

      // Verify EF FK was set to null (not soft-deleted)
      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.dimensionValue1Id).toBeNull();
      expect(updatedEf!.status).toBe(EmissionFactorStatus.ACTIVE);
    });

    it("should remove values and soft-delete EFs for required dimension", async () => {
      const { dimension, value, subcategory } = await buildTestDimension({
        isRequired: true,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { dimensionValue1Id: value.id }
      );

      // Add another value so we don't drop below 1
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Remaining Value",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [value.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(200);

      const updatedValue = await prisma.emissionFactorDimensionValue.findUnique(
        {
          where: { id: value.id },
        }
      );
      expect(updatedValue!.status).toBe(
        EmissionFactorDimensionValueStatus.DELETED
      );

      // Verify EF was soft-deleted
      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.status).toBe(EmissionFactorStatus.DELETED);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when removing all values with no adds", async () => {
      const { dimension, value } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [value.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_MUST_HAVE_AT_LEAST_ONE_VALUE");
    });

    it("should return 409 when adding a duplicate value name", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { add: ["Initial Value"] }, // Already exists
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DUPLICATE_DIMENSION_VALUE");
    });

    it("should return 404 for nonexistent dimension", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/emission-factor-dimensions/999999",
        payload: { name: "Ghost" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 409 when changing isRequired while active emission factors exist for the subcategory", async () => {
      const { dimension, subcategory } = await buildTestDimension({
        isRequired: false,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      await createTestEmissionFactor(prisma, subcategory.id, rateUnitId, {});

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: { isRequired: true },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_IS_REQUIRED_CHANGE_BLOCKED");
    });

    it("should return 404 when removing a value that does not belong to the dimension", async () => {
      const { dimension } = await buildTestDimension();
      // A value that belongs to a *different* dimension.
      const otherDimension = await createTestEmissionFactorDimension(
        prisma,
        dimension.subcategoryId,
        { position: 2 }
      );
      const foreignValue = await createTestEmissionFactorDimensionValue(
        prisma,
        otherDimension.id,
        { value: "Foreign Value" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [foreignValue.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_VALUE_NOT_FOUND_FOR_REMOVAL");
    });

    it("should return 404 when renaming a nonexistent value", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { rename: [{ id: "999999", newValue: "New Name" }] },
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DIMENSION_VALUE_NOT_FOUND_FOR_RENAME");
    });

    it("should return 409 when renaming a value to a name that already exists", async () => {
      const { dimension, value } = await buildTestDimension();
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Already Exists",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: {
            rename: [{ id: value.id.toString(), newValue: "Already Exists" }],
          },
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DUPLICATE_DIMENSION_VALUE");
    });
  });

  describe("Position 2 removal branches", () => {
    it("should remove a value and soft-delete EFs for a required position-2 dimension", async () => {
      const { dimension, value, subcategory } = await buildTestDimension({
        position: 2,
        isRequired: true,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { dimensionValue2Id: value.id }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Backup Dim2 Value",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [value.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(200);

      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.status).toBe(EmissionFactorStatus.DELETED);
    });

    it("should remove a value and nullify the FK for a non-required position-2 dimension", async () => {
      const { dimension, value, subcategory } = await buildTestDimension({
        position: 2,
        isRequired: false,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { dimensionValue2Id: value.id }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Backup Dim2 Value",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: { remove: [value.id.toString()] },
        },
      });

      expect(response.statusCode).toBe(200);

      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.dimensionValue2Id).toBeNull();
      expect(updatedEf!.status).toBe(EmissionFactorStatus.ACTIVE);
    });
  });

  describe("Rename edge cases", () => {
    it("should accept an explicit empty rename array alongside another field change", async () => {
      const { dimension } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          name: "Renamed With Empty Rename Array",
          values: { rename: [] },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.name).toBe("Renamed With Empty Rename Array");
    });

    it("should successfully rename a value when the new name has no conflict", async () => {
      const { dimension, value } = await buildTestDimension();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
        payload: {
          values: {
            rename: [{ id: value.id.toString(), newValue: "Renamed Value" }],
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateEmissionFactorDimensionResponse;
      expect(body.values.map((v) => v.value)).toContain("Renamed Value");

      const updatedValue = await prisma.emissionFactorDimensionValue.findUnique(
        { where: { id: value.id } }
      );
      expect(updatedValue!.value).toBe("Renamed Value");
    });
  });

  describe("Direct service invocation (bypassing HTTP-level authentication)", () => {
    // The route requires authentication (`requireAuth`), so `user` is always
    // set on every real HTTP request; the service's own `!user` guard can
    // only be reached by calling the service directly with `null`.
    it("should throw USER_NOT_FOUND when no user is provided", async () => {
      const { dimension } = await buildTestDimension();

      await expect(
        updateEmissionFactorDimensionService(
          prisma,
          dimension.id.toString(),
          { name: "No User Update" },
          null
        )
      ).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
    });

    it("should rethrow a non-duplicate database error unchanged (foreign key violation)", async () => {
      const { dimension } = await buildTestDimension();
      const testUser = await prisma.user.findFirstOrThrow();
      const bogusUser = { ...mapUserToResponse(testUser), id: "999999999999" };

      await expect(
        updateEmissionFactorDimensionService(
          prisma,
          dimension.id.toString(),
          { values: { add: ["FK Violation Value"] } },
          bogusUser
        )
      ).rejects.toThrow();
    });
  });

  describe("Real database-level P2002 conflicts (bypassing the in-app pre-check)", () => {
    // The in-app duplicate check for `values.add` reads existing ACTIVE
    // values inside the same transaction, so a *sequential* (already
    // committed) conflicting value is always caught there, never by the
    // service's own `catch` block. Hold a conflicting value open
    // (uncommitted) in a separate transaction so the service's own read
    // (under READ COMMITTED) can't see it, forcing its own INSERT to
    // collide with the real unique index once the holder transaction
    // commits.
    it("should surface a real Prisma P2002 as DUPLICATE_DIMENSION_VALUE when a concurrent transaction holds the same value", async () => {
      const { dimension } = await buildTestDimension();
      const dbUser = await prisma.user.findFirstOrThrow();

      const holderPromise = prisma.$transaction(async (tx) => {
        await tx.emissionFactorDimensionValue.create({
          data: {
            dimensionId: dimension.id,
            value: "Held Concurrent Value",
            status: EmissionFactorDimensionValueStatus.ACTIVE,
            createdById: BigInt(dbUser.id),
            updatedAt: null,
          },
        });
        // Hold the row open (uncommitted) long enough for the concurrent
        // service call below to run its own duplicate check (which can't
        // see this uncommitted row) and reach its own INSERT, which then
        // blocks on the real unique index until this transaction commits.
        // `pg_sleep` returns `void`, which the driver adapter can't
        // deserialize via `$queryRaw`, so `$executeRaw` is used instead.
        await tx.$executeRaw`SELECT pg_sleep(0.3)`;
      });

      // Give the holder's INSERT time to land before starting the service call.
      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(
        updateEmissionFactorDimensionService(
          prisma,
          dimension.id.toString(),
          { values: { add: ["Held Concurrent Value"] } },
          mapUserToResponse(dbUser)
        )
      ).rejects.toMatchObject({ code: "DUPLICATE_DIMENSION_VALUE" });

      await holderPromise;
    });
  });

  describe("Concurrency", () => {
    // Both concurrent requests read the existing active values before either
    // commits its new row, so the second `create` collides with the real
    // partial unique index on (dimension_id, value) and is caught as a
    // genuine Prisma P2002 -- not just the earlier in-request duplicate check.
    it("should return 409 for exactly one of two concurrent additions of the same value name", async () => {
      const { dimension } = await buildTestDimension();

      const payload = { values: { add: ["Race Value"] } };

      const [first, second] = await Promise.all([
        app.inject({
          method: "PATCH",
          url: `/api/emission-factor-dimensions/${dimension.id}`,
          payload,
        }),
        app.inject({
          method: "PATCH",
          url: `/api/emission-factor-dimensions/${dimension.id}`,
          payload,
        }),
      ]);

      const statusCodes = [first.statusCode, second.statusCode].sort();
      expect(statusCodes).toEqual([200, 409]);

      const conflictResponse = first.statusCode === 409 ? first : second;
      const body = JSON.parse(conflictResponse.body) as { code: string };
      expect(body.code).toBe("DUPLICATE_DIMENSION_VALUE");
    });
  });
});
