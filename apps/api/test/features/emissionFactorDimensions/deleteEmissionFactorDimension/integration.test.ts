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
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("DELETE /api/emission-factor-dimensions/:id - Integration Tests", () => {
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

  async function buildTestDimensionWithEF() {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - For Dimension Deletion",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Delete Dim Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Delete Dim Subcategory",
    });
    const dimension = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { position: 1, isRequired: true }
    );
    const value = await createTestEmissionFactorDimensionValue(
      prisma,
      dimension.id,
      { value: "To Be Deleted" }
    );
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);
    const ef = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { dimensionValue1Id: value.id }
    );

    return { methodology, subcategory, dimension, value, ef, rateUnitId };
  }

  async function buildSubcategoryWithTwoDimensions() {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - For Two Dimensions Deletion",
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Two Dimensions Category",
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: "Test - Two Dimensions Subcategory",
    });
    const dimension1 = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { position: 1, isRequired: true }
    );
    const dimension2 = await createTestEmissionFactorDimension(
      prisma,
      subcategory.id,
      { position: 2, isRequired: false }
    );

    return { methodology, category, subcategory, dimension1, dimension2 };
  }

  describe("Successful deletion", () => {
    it("should delete the dimension and soft-delete associated emission factors", async () => {
      const { dimension, ef } = await buildTestDimensionWithEF();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
      });

      expect(response.statusCode).toBe(200);

      // Verify dimension is soft-deleted
      const deletedDim = await prisma.emissionFactorDimension.findUnique({
        where: { id: dimension.id },
      });
      expect(deletedDim).not.toBeNull();
      expect(deletedDim!.status).toBe(EmissionFactorDimensionStatus.DELETED);

      // Verify emission factor was soft-deleted
      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.status).toBe(EmissionFactorStatus.DELETED);
    });

    it("should cascade-delete dimension values", async () => {
      const { dimension, value } = await buildTestDimensionWithEF();

      await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
      });

      const deletedValue = await prisma.emissionFactorDimensionValue.findUnique(
        {
          where: { id: value.id },
        }
      );
      expect(deletedValue).not.toBeNull();
      expect(deletedValue!.status).toBe(
        EmissionFactorDimensionValueStatus.DELETED
      );
    });

    it("should delete a dimension with no emission factors", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Delete No EF",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Delete No EF Cat",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id, {
        name: "Test - Delete No EF Sub",
      });
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1 }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Lonely",
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension.id}`,
      });

      expect(response.statusCode).toBe(200);

      const deletedDim = await prisma.emissionFactorDimension.findUnique({
        where: { id: dimension.id },
      });
      expect(deletedDim!.status).toBe(EmissionFactorDimensionStatus.DELETED);
    });

    it("should allow deleting position 2 when the subcategory has two dimensions", async () => {
      const { dimension2 } = await buildSubcategoryWithTwoDimensions();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension2.id}`,
      });

      expect(response.statusCode).toBe(200);

      const deletedDim = await prisma.emissionFactorDimension.findUnique({
        where: { id: dimension2.id },
      });
      expect(deletedDim!.status).toBe(EmissionFactorDimensionStatus.DELETED);
    });

    it("should nullify the FK on emission factors referencing a non-required position-2 dimension's values", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Delete Dim2 Non-Required",
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: "Test - Delete Dim2 Non-Required Category",
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id, {
        name: "Test - Delete Dim2 Non-Required Subcategory",
      });
      const dimension2 = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 2, isRequired: false }
      );
      const value = await createTestEmissionFactorDimensionValue(
        prisma,
        dimension2.id,
        { value: "Dim2 Value" }
      );
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      const ef = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateUnitId,
        { dimensionValue2Id: value.id }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension2.id}`,
      });

      expect(response.statusCode).toBe(200);

      const updatedEf = await prisma.emissionFactor.findUnique({
        where: { id: ef.id },
      });
      expect(updatedEf!.dimensionValue2Id).toBeNull();
      expect(updatedEf!.status).toBe(EmissionFactorStatus.ACTIVE);
    });
  });

  describe("Error cases", () => {
    it("should return 404 for nonexistent dimension", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/emission-factor-dimensions/999999",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should reject deleting position 1 when the subcategory has two dimensions", async () => {
      const { dimension1, dimension2 } =
        await buildSubcategoryWithTwoDimensions();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factor-dimensions/${dimension1.id}`,
      });

      expect(response.statusCode).toBe(409);

      const persistedDim1 = await prisma.emissionFactorDimension.findUnique({
        where: { id: dimension1.id },
      });
      const persistedDim2 = await prisma.emissionFactorDimension.findUnique({
        where: { id: dimension2.id },
      });

      expect(persistedDim1!.status).toBe(EmissionFactorDimensionStatus.ACTIVE);
      expect(persistedDim2!.status).toBe(EmissionFactorDimensionStatus.ACTIVE);
    });
  });
});
