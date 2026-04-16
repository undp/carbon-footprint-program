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
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  getSubcategoryIds,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
} from "@test/factories/carbonInventorySeeder.js";
import {
  type SyncCarbonInventoryLinesResponse,
  CarbonInventoryLineStatus,
  EmissionFactorStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import { Prisma, type PrismaClient } from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ApiErrorResponse,
} from "@/commonSchemas/errors.js";
import {
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";

describe("POST /api/carbon-inventories/:id/lines/sync - Integration Tests", () => {
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

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Create operations", () => {
    it("should create a new empty line", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(firstSubcategoryId),
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
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(1);
      expect(body.updated).toHaveLength(0);
      expect(body.deleted).toHaveLength(0);

      const createdLine = body.created[0];
      expect(createdLine).toHaveProperty("id");
      expect(createdLine.subcategoryId).toBe(String(firstSubcategoryId));
      expect(createdLine.dimensionValue1Id).toBeNull();
      expect(createdLine.dimensionValue2Id).toBeNull();
      expect(createdLine.quantity).toBeNull();

      // Verify the line was created in the database
      const line = await prisma.carbonInventoryLine.findUnique({
        where: { id: BigInt(createdLine.id) },
      });
      expect(line).toBeDefined();
      expect(line?.carbonInventoryId).toBe(carbonInventory.id);
    });

    it("should create a line with manual total emissions (DIRECT mode)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const firstSubcategoryId = subcategoryIds[0];

      const manualTotalEmissions = 500000;

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(firstSubcategoryId),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions,
              comment: "Direct emission entry",
              inputType: "DIRECT",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(1);
      const createdLine = body.created[0];
      expect(createdLine.manualTotalEmissions).toBe(manualTotalEmissions);
      expect(createdLine.comment).toBe("Direct emission entry");

      // Verify input was created with DIRECT type
      const input = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: BigInt(createdLine.id),
          isActive: true,
        },
      });
      expect(input).toBeDefined();
      expect(input?.inputType).toBe("DIRECT");
    });

    it("should create multiple lines in a single request", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategoryIds[0]),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions: 100000,
              comment: "First line",
              inputType: "DIRECT",
            },
            {
              subcategoryId: String(subcategoryIds[1]),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions: 200000,
              comment: "Second line",
              inputType: "DIRECT",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(2);
      expect(body.created[0].comment).toBe("First line");
      expect(body.created[1].comment).toBe("Second line");
    });

    it("should create a line with automatic factor (SIMPLIFIED mode)", async () => {
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
      let emissionFactor = await prisma.emissionFactor.findFirst({
        where: {
          subcategoryId: subcategory.id,
          status: EmissionFactorStatus.ACTIVE,
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
            status: EmissionFactorStatus.ACTIVE,
            updatedAt: null,
          },
        });
      }

      const quantity = 1500;
      const appliedFactorValue = 2.31;

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategory.id),
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
              comment: "Automatic factor test",
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(1);
      const createdLine = body.created[0];
      expect(createdLine.isManualTotalEmissions).toBe(false);
      expect(createdLine.quantity).toBe(quantity);
      expect(createdLine.factorSource).toBe("DEFRA 2025");
      expect(createdLine.factorValue).toBe(appliedFactorValue);

      // Verify input type is SIMPLIFIED
      const activeInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: BigInt(createdLine.id),
          isActive: true,
        },
      });
      expect(activeInput?.inputType).toBe("SIMPLIFIED");
    });

    it("should create a line with manual factor (EXPERT mode - Factor Propio)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      // Get a subcategory
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategory.id),
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
              comment: "Manual factor test",
              inputType: "EXPERT",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(1);
      const createdLine = body.created[0];
      expect(createdLine.isManualTotalEmissions).toBe(false);
      expect(createdLine.quantity).toBe(quantity);
      expect(createdLine.factorSource).toBe("Factor Propio");
      expect(createdLine.factorValue).toBe(appliedFactorValue);

      // Verify input type is EXPERT
      const activeInput = await prisma.carbonInventoryLineInput.findFirst({
        where: {
          lineId: BigInt(createdLine.id),
          isActive: true,
        },
      });
      expect(activeInput).not.toBeNull();
      expect(activeInput!.inputType).toBe("EXPERT");
      expect(activeInput!.manualFactor?.toNumber()).toBe(appliedFactorValue);
      expect(activeInput!.manualFactorSource).toBe("Factor Propio");
    });
  });

  describe("Update operations", () => {
    it("should update an existing line", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const firstSubcategoryId = subcategoryIds[0];
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // Create an initial input that will be deactivated during the update
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
        quantity: Prisma.Decimal(100),
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [
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
              manualTotalEmissions: 250000,
              comment: "Updated via sync",
              inputType: "DIRECT",
            },
          ],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(0);
      expect(body.updated).toHaveLength(1);
      expect(body.deleted).toHaveLength(0);

      const updatedLine = body.updated[0];
      expect(updatedLine.id).toBe(line.id.toString());
      expect(updatedLine.manualTotalEmissions).toBe(250000);
      expect(updatedLine.comment).toBe("Updated via sync");

      // Verify old input is inactive and new input is active
      const inputs = await prisma.carbonInventoryLineInput.findMany({
        where: { lineId: line.id },
      });
      const activeInputs = inputs.filter((i) => i.isActive);
      const inactiveInputs = inputs.filter((i) => !i.isActive);

      expect(activeInputs).toHaveLength(1);
      expect(inactiveInputs.length).toBeGreaterThanOrEqual(1);
    });

    it("should update multiple lines in a single request", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [
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
              manualTotalEmissions: 100000,
              comment: "Line 1 updated",
              inputType: "DIRECT",
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
              manualTotalEmissions: 200000,
              comment: "Line 2 updated",
              inputType: "DIRECT",
            },
          ],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.updated).toHaveLength(2);
    });
  });

  describe("Delete operations", () => {
    it("should soft delete a line", async () => {
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [{ id: line.id.toString() }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(0);
      expect(body.updated).toHaveLength(0);
      expect(body.deleted).toHaveLength(1);
      expect(body.deleted[0]).toBe(line.id.toString());

      // Verify line is soft deleted (status changed to DELETED)
      const lineAfterDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line.id },
      });
      expect(lineAfterDelete?.status).toBe(CarbonInventoryLineStatus.DELETED);
    });

    it("should delete multiple lines in a single request", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [{ id: line1.id.toString() }, { id: line2.id.toString() }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.deleted).toHaveLength(2);
      expect(body.deleted).toContain(line1.id.toString());
      expect(body.deleted).toContain(line2.id.toString());
    });
  });

  describe("Mixed operations (create, update, delete in single request)", () => {
    it("should handle create, update, and delete in a single atomic transaction", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const lineToUpdate = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      const lineToDelete = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategoryIds[0]),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions: 100000,
              comment: "New line",
              inputType: "DIRECT",
            },
          ],
          update: [
            {
              id: lineToUpdate.id.toString(),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions: 200000,
              comment: "Updated line",
              inputType: "DIRECT",
            },
          ],
          delete: [{ id: lineToDelete.id.toString() }],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(1);
      expect(body.updated).toHaveLength(1);
      expect(body.deleted).toHaveLength(1);

      expect(body.created[0].comment).toBe("New line");
      expect(body.updated[0].comment).toBe("Updated line");
      expect(body.deleted[0]).toBe(lineToDelete.id.toString());
    });

    it("should handle empty sync (no operations)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as SyncCarbonInventoryLinesResponse;

      expect(body.created).toHaveLength(0);
      expect(body.updated).toHaveLength(0);
      expect(body.deleted).toHaveLength(0);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 404 when subcategory does not exist for create", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: "999999",
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
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBe("One or more subcategories not found");
    });

    it("should return 404 when line does not exist for update", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [
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
              inputType: "SIMPLIFIED",
            },
          ],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toContain("Line with ID");
      expect(body.message).toContain("not found");
    });

    it("should return 404 when line does not exist for delete", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [{ id: "999999" }],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toContain("Line with ID");
      expect(body.message).toContain("not found");
    });

    it("should return 400 when line belongs to a different carbon inventory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory1 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const carbonInventory2 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const lineInInventory2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory2.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory1.id}/lines/sync`,
        payload: {
          create: [],
          update: [
            {
              id: lineInInventory2.id.toString(),
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
              inputType: "SIMPLIFIED",
            },
          ],
          delete: [],
        },
      });

      // The line exists but belongs to a different inventory, returns 422 (unprocessable entity)
      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.message).toContain("does not belong to carbon inventory");
    });

    it("should return 400 for invalid payload structure", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: "invalid",
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 422 when subcategory does not belong to the carbon inventory's methodology", async () => {
      const methodologyId1 = await getTestMethodologyVersionId(prisma);
      const emptyMethodology = await createEmptyMethodologyVersion(prisma);

      // Create a carbon inventory with methodology 1
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId1 }
      );

      // Create a category in methodology 2
      const category = await prisma.category.create({
        data: {
          methodologyVersionId: emptyMethodology.id,
          name: "Test Category",
          position: 1,
          synonyms: "Test Synonyms",
          description: "Test Description",
          icon: "FACTORY",
          color: "#000000",
          updatedAt: null,
        },
      });

      // Create a subcategory in methodology 2
      const subcategoryInMethodology2 = await prisma.subcategory.create({
        data: {
          categoryId: category.id,
          name: "Test Subcategory",
          icon: "TRUCK",
          description: "Test Description",
          updatedAt: null,
        },
      });

      // Try to create a line with subcategory from methodology 2
      // but carbon inventory uses methodology 1
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategoryInMethodology2.id),
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
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_NOT_IN_METHODOLOGY");
      expect(body.message).toBe(
        "One or more subcategories do not belong to the carbon inventory's methodology"
      );
    });

    it("should return 404 when trying to delete an already deleted line", async () => {
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

      // Manually delete the line by setting its status to DELETED
      await prisma.carbonInventoryLine.update({
        where: { id: line.id },
        data: { status: CarbonInventoryLineStatus.DELETED },
      });

      // Try to delete the already-deleted line
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [{ id: line.id.toString() }],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toContain("Line with ID");
      expect(body.message).toContain("not found");
    });

    it("should return 400 when duplicate line IDs are in update array", async () => {
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [
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
              inputType: "SIMPLIFIED",
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
              manualTotalEmissions: 100,
              comment: null,
              inputType: "DIRECT",
            },
          ],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toContain("Duplicate");
    });

    it("should return 400 when same line ID is in both update and delete arrays", async () => {
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [],
          update: [
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
              inputType: "SIMPLIFIED",
            },
          ],
          delete: [{ id: line.id.toString() }],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when quantity is negative", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategoryIds[0]),
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
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Transaction atomicity", () => {
    it("should rollback all operations if any operation fails", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const existingLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Count lines before the failed sync
      const lineCountBefore = await prisma.carbonInventoryLine.count({
        where: { carbonInventoryId: carbonInventory.id },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/lines/sync`,
        payload: {
          create: [
            {
              subcategoryId: String(subcategoryIds[0]),
              dimensionValue1Id: null,
              dimensionValue2Id: null,
              measurementUnitId: null,
              quantity: null,
              factorSource: null,
              baseFactorId: null,
              appliedFactorValue: null,
              appliedFactorRateMeasurementUnitId: null,
              manualTotalEmissions: null,
              comment: "This should be rolled back",
              inputType: "SIMPLIFIED",
            },
          ],
          update: [],
          delete: [{ id: "999999" }], // Invalid line ID - should cause failure
        },
      });

      expect(response.statusCode).toBe(404);

      // Verify no new lines were created (transaction rolled back)
      const lineCountAfter = await prisma.carbonInventoryLine.count({
        where: { carbonInventoryId: carbonInventory.id },
      });

      expect(lineCountAfter).toBe(lineCountBefore);

      // Verify the existing line was not modified
      const unchangedLine = await prisma.carbonInventoryLine.findUnique({
        where: { id: existingLine.id },
      });
      expect(unchangedLine?.status).toBe(CarbonInventoryLineStatus.ACTIVE);
    });
  });
});
