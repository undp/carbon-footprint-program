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
  });
});
