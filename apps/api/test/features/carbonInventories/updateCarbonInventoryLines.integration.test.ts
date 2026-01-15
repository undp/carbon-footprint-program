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
  getActiveStatusId,
} from "@test/factories/carbonInventorySeeder.js";
import type { UpdateCarbonInventoryLinesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { InputType, type PrismaClient } from "@repo/database";
import type {
  NotFoundErrorResponse,
  ValidationErrorResponse,
} from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { Prisma } from "@repo/database";

describe("PATCH /api/carbon-inventories/:id/lines - Integration Tests", () => {
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

  describe("Use Case 1: Empty line (all null)", () => {
    it("should update a line to empty state with all fields null", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventoryLinesResponse;

      expect(body).toHaveLength(1);
      const updatedLine = body[0];
      expect(updatedLine.id).toBe(line.id.toString());
      expect(updatedLine.dimensionValue1Id).toBeNull();
      expect(updatedLine.dimensionValue2Id).toBeNull();
      expect(updatedLine.quantity).toBeNull();
      expect(updatedLine.measurementUnitId).toBeNull();
      expect(updatedLine.factorSource).toBeNull();
      expect(updatedLine.factorValue).toBeNull();
      expect(updatedLine.factorRateMeasurementUnitId).toBeNull();
      expect(updatedLine.manualTotalEmissions).toBeNull();
      expect(updatedLine.comment).toBeNull();

      // Verify old input is marked as inactive
      const allInputs = await prisma.carbonInventoryLineInput.findMany({
        where: {
          lineId: line.id,
        },
      });
      const oldInputs = allInputs.filter((input) => !input.isActive);
      // Verify that all inactive inputs are actually deactivated
      for (const input of oldInputs) {
        expect(input.isActive).toBe(false);
      }

      // Verify new active input exists
      const activeInputs = await prisma.carbonInventoryLineInput.findMany({
        where: {
          lineId: line.id,
          isActive: true,
        },
      });
      expect(activeInputs.length).toBe(1);
      expect(activeInputs[0].inputType).toBe(InputType.DETAILED);
    });
  });

  describe("Use Case 2: Manual total emissions (DIRECT mode)", () => {
    it("should update a line with manual total emissions", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      const manualTotalEmissions = 500000;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: manualTotalEmissions,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventoryLinesResponse;

      expect(body).toHaveLength(1);
      const updatedLine = body[0];
      expect(updatedLine.id).toBe(line.id.toString());
      expect(updatedLine.isManualTotalEmissions).toBe(true);
      expect(updatedLine.manualTotalEmissions).toBe(manualTotalEmissions);
      expect(updatedLine.dimensionValue1Id).toBeNull();
      expect(updatedLine.dimensionValue2Id).toBeNull();
      expect(updatedLine.quantity).toBeNull();

      // Verify input type is DIRECT
      const activeInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: line.id,
          isActive: true,
        },
      });
      expect(activeInput?.inputType).toBe(InputType.DIRECT);
      expect(activeInput?.directTotalEmissions?.toNumber()).toBe(
        manualTotalEmissions
      );

      // Verify result was created
      const result = await prisma.carbonInventoryLineResult.findFirst({
        where: {
          lineInputId: activeInput!.id,
        },
      });
      expect(result).toBeDefined();
      expect(result?.totalEmissions.toNumber()).toBe(manualTotalEmissions);
    });
  });

  describe("Use Case 3: Automatic factor (DETAILED line input type)", () => {
    it("should update a line with automatic factor from emission factor database", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      // Get a subcategory with dimensions
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          category: {
            methodologyVersionId: methodologyId,
          },
          id: 1,
        },
        include: {
          dimensions: {
            include: {
              values: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!subcategory || subcategory.dimensions.length === 0) {
        // Skip test if no subcategory with dimensions exists
        return;
      }

      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategory.id
      );

      // Get measurement unit and rate measurement unit
      const measurementUnit = await prisma.measurementUnit.findFirst();
      if (!measurementUnit) {
        throw new Error("No measurement units found in database");
      }

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst({
        where: {
          denominatorMeasurementUnit: {
            abbreviation: measurementUnit.abbreviation,
          },
        },
        include: {
          denominatorMeasurementUnit: true,
        },
      });

      if (!rateMeasurementUnit) {
        throw new Error(
          "No rate measurement unit found matching measurement unit"
        );
      }

      const dimension1 = subcategory.dimensions.find((d) => d.position === 1);
      const dimensionValue1 =
        dimension1 && dimension1.values.length > 0
          ? dimension1.values[0]
          : null;

      // Get or create an emission factor for this subcategory
      const activeStatus = await getActiveStatusId(prisma);
      let emissionFactor = await prisma.emissionFactor.findFirst({
        where: {
          subcategoryId: subcategory.id,
          statusId: activeStatus,
          dimensionValue1Id: dimensionValue1?.id ?? null,
          dimensionValue2Id: null,
        },
      });

      if (!emissionFactor) {
        // Create a test emission factor
        emissionFactor = await prisma.emissionFactor.create({
          data: {
            subcategoryId: subcategory.id,
            dimensionValue1Id: dimensionValue1?.id ?? null,
            dimensionValue2Id: null,
            rateMeasurementUnitId: rateMeasurementUnit.id,
            source: "DEFRA 2025",
            gasDetails: {},
            value: new Prisma.Decimal("2.31"),
            statusId: activeStatus,
          },
        });
      }

      const quantity = 1500;
      const appliedFactorValue = 2.31;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: dimensionValue1?.id.toString() ?? null,
            dimensionValue2Id: null,
            measurementUnitId: measurementUnit.id.toString(),
            quantity,
            factorSource: "DEFRA 2025",
            baseFactorId: emissionFactor.id.toString(),
            appliedFactorValue: appliedFactorValue,
            appliedFactorRateMeasurementUnitId:
              rateMeasurementUnit.id.toString(),
            manualTotalEmissions: null,
            comment: "Consumo mensual de gas natural en calderas",
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventoryLinesResponse;

      expect(body).toHaveLength(1);
      const updatedLine = body[0];
      expect(updatedLine.id).toBe(line.id.toString());
      expect(updatedLine.isManualTotalEmissions).toBe(false);
      expect(updatedLine.quantity).toBe(quantity);
      expect(updatedLine.measurementUnitId).toBe(measurementUnit.id.toString());
      expect(updatedLine.factorSource).toBe("DEFRA 2025");
      expect(updatedLine.factorValue).toBe(appliedFactorValue);
      expect(updatedLine.factorRateMeasurementUnitId).toBe(
        rateMeasurementUnit.id.toString()
      );
      expect(updatedLine.comment).toBe(
        "Consumo mensual de gas natural en calderas"
      );

      // Verify input type is DETAILED
      const activeInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: line.id,
          isActive: true,
        },
      });
      expect(activeInput?.inputType).toBe(InputType.DETAILED);

      // Verify factor was created
      const factor = await prisma.carbonInventoryLineFactor.findFirst({
        where: {
          lineInputId: activeInput!.id,
        },
      });
      expect(factor).toBeDefined();
      expect(factor?.emissionFactorId).toBe(emissionFactor.id);
      expect(factor?.appliedFactorValue.toNumber()).toBe(appliedFactorValue);

      // Verify result was created
      const result = await prisma.carbonInventoryLineResult.findFirst({
        where: {
          lineInputId: activeInput!.id,
        },
      });
      expect(result).toBeDefined();
      expect(result?.totalEmissions.toNumber()).toBe(
        quantity * appliedFactorValue
      );
    });
  });

  describe("Use Case 4: Manual factor (EXPERT mode)", () => {
    it("should update a line with manual factor (Factor Propio)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      // Get a subcategory with dimensions
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          category: {
            methodologyVersionId: methodologyId,
          },
        },
        include: {
          dimensions: {
            include: {
              values: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },
      });

      if (!subcategory) {
        throw new Error("No subcategory found");
      }

      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategory.id
      );

      // Get measurement unit and rate measurement unit
      const measurementUnit = await prisma.measurementUnit.findFirst();
      if (!measurementUnit) {
        throw new Error("No measurement units found in database");
      }

      const rateMeasurementUnit = await prisma.rateMeasurementUnit.findFirst({
        where: {
          denominatorMeasurementUnit: {
            abbreviation: measurementUnit.abbreviation,
          },
        },
      });

      if (!rateMeasurementUnit) {
        throw new Error(
          "No rate measurement unit found matching measurement unit"
        );
      }

      const dimension1 = subcategory.dimensions.find((d) => d.position === 1);
      const dimensionValue1 =
        dimension1 && dimension1.values.length > 0
          ? dimension1.values[0]
          : null;

      const quantity = 1500;
      const appliedFactorValue = 2.999;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: dimensionValue1?.id.toString() ?? null,
            dimensionValue2Id: null,
            measurementUnitId: measurementUnit.id.toString(),
            quantity,
            factorSource: "Factor Propio",
            baseFactorId: null,
            appliedFactorValue: appliedFactorValue,
            appliedFactorRateMeasurementUnitId:
              rateMeasurementUnit.id.toString(),
            manualTotalEmissions: null,
            comment: "Consumo mensual de gas natural en calderas",
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventoryLinesResponse;

      expect(body).toHaveLength(1);
      const updatedLine = body[0];
      expect(updatedLine.id).toBe(line.id.toString());
      expect(updatedLine.isManualTotalEmissions).toBe(false);
      expect(updatedLine.quantity).toBe(quantity);
      expect(updatedLine.factorSource).toBe("Factor Propio");
      expect(updatedLine.factorValue).toBe(appliedFactorValue);

      // Verify input type is DETAILED
      const activeInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: line.id,
          isActive: true,
        },
      });

      expect(activeInput).not.toBeNull();
      expect(activeInput!.inputType).toBe(InputType.DETAILED);
      expect(activeInput!.manualFactor?.toNumber()).toBe(appliedFactorValue);
      expect(activeInput!.manualFactorSource).toBe("Factor Propio");

      // Verify factor was created (but without emissionFactorId)
      const factor = await prisma.carbonInventoryLineFactor.findFirst({
        where: {
          lineInputId: activeInput!.id,
        },
      });

      expect(factor).not.toBeNull();
      expect(factor!.emissionFactorId).toBeNull();
      expect(factor!.appliedFactorValue.toNumber()).toBe(appliedFactorValue);

      // Verify result was created
      const result = await prisma.carbonInventoryLineResult.findFirst({
        where: {
          lineInputId: activeInput!.id,
        },
      });
      expect(result).toBeDefined();
      expect(result?.totalEmissions.toNumber()).toBe(
        quantity * appliedFactorValue
      );
    });
  });

  describe("No change optimization", () => {
    it("should not create a new input when data is unchanged", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // First update - create initial input
      const initialPayload = {
        id: line.id.toString(),
        dimensionValue1Id: null,
        dimensionValue2Id: null,
        measurementUnitId: null,
        quantity: null,
        factorSource: null,
        baseFactorId: null,
        appliedFactorValue: null,
        appliedFactorRateMeasurementUnitId: null,
        manualTotalEmissions: null,
        comment: null,
      };

      const firstResponse = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [initialPayload],
      });

      expect(firstResponse.statusCode).toBe(200);

      // Get the initial active input ID
      const initialActiveInput =
        await prisma.carbonInventoryLineInput.findFirst({
          where: {
            lineId: line.id,
            isActive: true,
          },
        });
      expect(initialActiveInput).toBeDefined();
      const initialInputId = initialActiveInput!.id;

      // Second update with same data - should not create a new input
      const secondResponse = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [initialPayload],
      });

      expect(secondResponse.statusCode).toBe(200);

      // Verify the same input is still active (no new input created)
      const finalActiveInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: line.id,
          isActive: true,
        },
      });
      expect(finalActiveInput).toBeDefined();
      expect(finalActiveInput!.id).toBe(initialInputId);

      // Verify no additional inactive inputs were created
      const allInputs = await prisma.carbonInventoryLineInput.findMany({
        where: {
          lineId: line.id,
        },
      });
      // Should only have one input (the active one)
      expect(allInputs.length).toBe(1);
    });
  });

  describe("Multiple lines update", () => {
    it("should update multiple lines at once", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const line2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line1.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
          {
            id: line2.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: 500000,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventoryLinesResponse;

      expect(body).toHaveLength(2);
      expect(body[0].id).toBe(line1.id.toString());
      expect(body[1].id).toBe(line2.id.toString());
      expect(body[1].manualTotalEmissions).toBe(500000);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when carbon inventory does not exist", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${nonExistentId}/lines`,
        payload: [
          {
            id: "1",
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Carbon inventory not found");
    });

    it("should return 404 when line does not exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: "999999",
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("One or more lines not found");
    });

    it("should return 400 when manualTotalEmissions is provided with other fields", async () => {
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

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: "1",
            dimensionValue2Id: null,
            measurementUnitId: "1",
            quantity: 100,
            factorSource: "DEFRA",
            baseFactorId: "1",
            appliedFactorValue: 2.5,
            appliedFactorRateMeasurementUnitId: "1",
            manualTotalEmissions: 500000,
            comment: "test",
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when factorSource is 'Factor Propio' but baseFactorId is provided", async () => {
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

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: "Factor Propio",
            baseFactorId: "1",
            appliedFactorValue: 2.5,
            appliedFactorRateMeasurementUnitId: "1",
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when quantity is negative", async () => {
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

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: -1,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when duplicate line IDs are provided", async () => {
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

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines`,
        payload: [
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
          {
            id: line.id.toString(),
            dimensionValue1Id: null,
            dimensionValue2Id: null,
            measurementUnitId: null,
            quantity: null,
            factorSource: null,
            baseFactorId: null,
            appliedFactorValue: null,
            appliedFactorRateMeasurementUnitId: null,
            manualTotalEmissions: null,
            comment: null,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ValidationErrorResponse;
      expect(body.message).toContain("Duplicate line IDs");
    });
  });
});
