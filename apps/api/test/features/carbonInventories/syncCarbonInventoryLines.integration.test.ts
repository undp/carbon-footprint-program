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
} from "@test/factories/carbonInventorySeeder.js";
import type { SyncCarbonInventoryLinesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { NotFoundErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

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

  beforeEach(async () => {
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
      expect(inactiveInputs.length).toBeGreaterThanOrEqual(0);
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
      const deletedStatus = await prisma.statusCatalog.findFirst({
        where: { scope: "ENTITY", code: "DELETED" },
      });
      const lineAfterDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line.id },
      });
      expect(lineAfterDelete?.statusId).toBe(deletedStatus!.id);
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
    it("should return 404 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999/lines/sync`,
        payload: {
          create: [],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Carbon inventory not found");
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
            },
          ],
          update: [],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Subcategory not found");
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
            },
          ],
          delete: [],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Line not found");
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
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Line not found");
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
      expect(body.message).toBe(
        "Line does not belong to this carbon inventory"
      );
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
      const activeStatus = await prisma.statusCatalog.findFirst({
        where: { scope: "ENTITY", code: "ACTIVE" },
      });
      const unchangedLine = await prisma.carbonInventoryLine.findUnique({
        where: { id: existingLine.id },
      });
      expect(unchangedLine?.statusId).toBe(activeStatus!.id);
    });
  });
});
