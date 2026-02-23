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
import {
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  getSubcategoryIds,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
} from "@test/factories/carbonInventorySeeder.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, Prisma } from "@repo/database";
import { EmissionFactorStatus } from "@repo/types";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

describe("DECIMAL(28, 10) Precision Constraints - Integration Tests", () => {
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
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("emission_factor.value", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          category: {
            methodologyVersionId: methodologyId,
          },
        },
      });

      if (!subcategory) {
        throw new Error("No subcategory found for testing");
      }

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const emissionFactor = await prisma.emissionFactor.create({
        data: {
          subcategoryId: subcategory.id,
          dimensionValue1Id: null,
          dimensionValue2Id: null,
          rateMeasurementUnitId: rateMeasurementUnit.id,
          source: "Test Source",
          gasDetails: {},
          value: valueWithExtraDecimals,
          status: EmissionFactorStatus.ACTIVE,
          updatedAt: null,
        },
      });

      expect(emissionFactor).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(emissionFactor.value.toString()).toBe("2.0123456789");

      // Cleanup
      await prisma.emissionFactor.delete({
        where: { id: emissionFactor.id },
      });
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          category: {
            methodologyVersionId: methodologyId,
          },
        },
      });

      if (!subcategory) {
        throw new Error("No subcategory found for testing");
      }

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value with 19 digits before decimal point should fail (28 - 10 = 18 max)
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        prisma.emissionFactor.create({
          data: {
            subcategoryId: subcategory.id,
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            rateMeasurementUnitId: rateMeasurementUnit.id,
            source: "Test Source",
            gasDetails: {},
            value: invalidValue,
            status: EmissionFactorStatus.ACTIVE,
            updatedAt: null,
          },
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits (18 digits before, 10 after)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          category: {
            methodologyVersionId: methodologyId,
          },
        },
      });

      if (!subcategory) {
        throw new Error("No subcategory found for testing");
      }

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const emissionFactor = await prisma.emissionFactor.create({
        data: {
          subcategoryId: subcategory.id,
          dimensionValue1Id: null,
          dimensionValue2Id: null,
          rateMeasurementUnitId: rateMeasurementUnit.id,
          source: "Test Source",
          gasDetails: {},
          value: validValue,
          status: EmissionFactorStatus.ACTIVE,
          updatedAt: null,
        },
      });

      expect(emissionFactor).toBeDefined();
      expect(emissionFactor.value.toString()).toBe(
        "123456789012345678.0123456789"
      );

      // Cleanup
      await prisma.emissionFactor.delete({
        where: { id: emissionFactor.id },
      });
    });
  });

  describe("carbon_inventory_line_input.quantity", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        quantity: valueWithExtraDecimals,
      });

      expect(input).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(input.quantity?.toString()).toBe("2.0123456789");
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 19 digits before decimal point should fail
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        createCarbonInventoryLineInput(prisma, line.id, {
          quantity: invalidValue,
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        quantity: validValue,
      });

      expect(input).toBeDefined();
      expect(input.quantity?.toString()).toBe("123456789012345678.0123456789");
    });
  });

  describe("carbon_inventory_line_input.direct_total_emissions", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: valueWithExtraDecimals,
      });

      expect(input).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(input.directTotalEmissions?.toString()).toBe("2.0123456789");
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 19 digits before decimal point should fail
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        createCarbonInventoryLineInput(prisma, line.id, {
          inputType: "DIRECT",
          directTotalEmissions: invalidValue,
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: validValue,
      });

      expect(input).toBeDefined();
      expect(input.directTotalEmissions?.toString()).toBe(
        "123456789012345678.0123456789"
      );
    });
  });

  describe("carbon_inventory_line_input.manual_factor", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        manualFactor: valueWithExtraDecimals,
      });

      expect(input).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(input.manualFactor?.toString()).toBe("2.0123456789");
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value with 19 digits before decimal point should fail
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        createCarbonInventoryLineInput(prisma, line.id, {
          manualFactor: invalidValue,
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        manualFactor: validValue,
      });

      expect(input).toBeDefined();
      expect(input.manualFactor?.toString()).toBe(
        "123456789012345678.0123456789"
      );
    });
  });

  describe("carbon_inventory_line_factor.applied_factor_value", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const factor = await prisma.carbonInventoryLineFactor.create({
        data: {
          lineInputId: input.id,
          appliedFactorValue: valueWithExtraDecimals,
          appliedFactorRateUnitId: rateMeasurementUnit.id,
          updatedAt: null,
        },
      });

      expect(factor).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(factor.appliedFactorValue.toString()).toBe("2.0123456789");
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value with 19 digits before decimal point should fail
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        prisma.carbonInventoryLineFactor.create({
          data: {
            lineInputId: input.id,
            appliedFactorValue: invalidValue,
            appliedFactorRateUnitId: rateMeasurementUnit.id,
            updatedAt: null,
          },
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst();
      if (!rateMeasurementUnit) {
        throw new Error("No rate measurement unit found for testing");
      }

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const factor = await prisma.carbonInventoryLineFactor.create({
        data: {
          lineInputId: input.id,
          appliedFactorValue: validValue,
          appliedFactorRateUnitId: rateMeasurementUnit.id,
          updatedAt: null,
        },
      });

      expect(factor).toBeDefined();
      expect(factor.appliedFactorValue.toString()).toBe(
        "123456789012345678.0123456789"
      );
    });
  });

  describe("carbon_inventory_line_result.total_emissions", () => {
    it("should truncate values with more than 10 decimal places to 10 decimal places", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      // Value with 11 decimal places should be truncated to 10
      const valueWithExtraDecimals = new Prisma.Decimal("2.01234567891");

      const result = await prisma.carbonInventoryLineResult.create({
        data: {
          lineInputId: input.id,
          totalEmissions: valueWithExtraDecimals,
          updatedAt: null,
        },
      });

      expect(result).toBeDefined();
      // Value should be truncated/rounded to 10 decimal places
      expect(result.totalEmissions.toString()).toBe("2.0123456789");
    });

    it("should reject values with more than 18 digits before decimal point", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      // Value with 19 digits before decimal point should fail
      const invalidValue = new Prisma.Decimal("1234567890123456789.123456789");

      await expect(
        prisma.carbonInventoryLineResult.create({
          data: {
            lineInputId: input.id,
            totalEmissions: invalidValue,
            updatedAt: null,
          },
        })
      ).rejects.toThrow();
    });

    it("should accept values at the maximum limits", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const input = await createCarbonInventoryLineInput(prisma, line.id);

      // Value at maximum: 18 digits before, 10 after
      const validValue = new Prisma.Decimal("123456789012345678.0123456789");

      const result = await prisma.carbonInventoryLineResult.create({
        data: {
          lineInputId: input.id,
          totalEmissions: validValue,
          updatedAt: null,
        },
      });

      expect(result).toBeDefined();
      expect(result.totalEmissions.toString()).toBe(
        "123456789012345678.0123456789"
      );
    });
  });
});
