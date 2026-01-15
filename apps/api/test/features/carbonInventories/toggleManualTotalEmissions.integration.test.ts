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
  getActiveStatusId,
  getOutdatedStatusId,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { FastifyInstance } from "fastify";
import { InputType, type PrismaClient } from "@repo/database";

describe("POST /api/carbon-inventories/:id/subcategories/:subcategoryId/manual-total-emissions - Integration Tests", () => {
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

  describe("Success cases", () => {
    it("should activate manual mode by marking active lines as outdated and creating a DIRECT line", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      // Create some active non-DIRECT lines
      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line1.id, {
        inputType: InputType.DETAILED,
      });

      const line2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line2.id, {
        inputType: InputType.DETAILED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(204);

      // Verify lines state
      const updatedLine1 = await prisma.carbonInventoryLine.findUnique({
        where: { id: line1.id },
      });
      const updatedLine2 = await prisma.carbonInventoryLine.findUnique({
        where: { id: line2.id },
      });

      const outdatedStatusId = await getOutdatedStatusId(prisma);
      const activeStatusId = await getActiveStatusId(prisma);

      expect(updatedLine1?.statusId).toBe(outdatedStatusId);
      expect(updatedLine2?.statusId).toBe(outdatedStatusId);

      // Verify new DIRECT line
      const directLine = await prisma.carbonInventoryLine.findFirst({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId,
          statusId: activeStatusId,
          inputs: { some: { inputType: InputType.DIRECT, isActive: true } },
        },
      });
      expect(directLine).toBeDefined();
    });

    it("should deactivate manual mode by marking DIRECT line as outdated and restoring previous lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      const activeStatusId = await getActiveStatusId(prisma);
      const outdatedStatusId = await getOutdatedStatusId(prisma);

      // Create some outdated non-DIRECT lines
      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { statusId: outdatedStatusId }
      );
      await createCarbonInventoryLineInput(prisma, line1.id, {
        inputType: InputType.DETAILED,
      });

      // Create an active DIRECT line
      const directLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { statusId: activeStatusId }
      );
      await createCarbonInventoryLineInput(prisma, directLine.id, {
        inputType: InputType.DIRECT,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: false },
      });

      expect(response.statusCode).toBe(204);

      // Verify states
      const updatedLine1 = await prisma.carbonInventoryLine.findUnique({
        where: { id: line1.id },
      });
      const updatedDirectLine = await prisma.carbonInventoryLine.findUnique({
        where: { id: directLine.id },
      });

      expect(updatedLine1?.statusId).toBe(activeStatusId);
      expect(updatedDirectLine?.statusId).toBe(outdatedStatusId);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999/subcategories/1/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 422 when activating manual mode but no active lines exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("NO_ACTIVE_LINES_TO_CONVERT");
    });
  });
});
