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
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { CarbonInventoryLineStatus } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { toggleManualTotalEmissionsService } from "@/features/carbonInventories/toggleManualTotalEmissions/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

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

  afterEach(async () => {
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
        inputType: "SIMPLIFIED",
      });

      const line2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line2.id, {
        inputType: "EXPERT",
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

      expect(updatedLine1?.status).toBe(CarbonInventoryLineStatus.OUTDATED);
      expect(updatedLine2?.status).toBe(CarbonInventoryLineStatus.OUTDATED);

      // Verify new DIRECT line
      const directLine = await prisma.carbonInventoryLine.findFirst({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId,
          status: CarbonInventoryLineStatus.ACTIVE,
          inputs: { some: { inputType: "DIRECT", isActive: true } },
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

      // Create some outdated non-DIRECT lines
      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { status: CarbonInventoryLineStatus.OUTDATED }
      );
      await createCarbonInventoryLineInput(prisma, line1.id, {
        inputType: "SIMPLIFIED",
      });

      // Create an active DIRECT line
      const directLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      await createCarbonInventoryLineInput(prisma, directLine.id, {
        inputType: "DIRECT",
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

      expect(updatedLine1?.status).toBe(CarbonInventoryLineStatus.ACTIVE);
      expect(updatedDirectLine?.status).toBe(
        CarbonInventoryLineStatus.OUTDATED
      );
    });
  });

  describe("Error cases", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999/subcategories/1/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("FORBIDDEN");
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

    it("returns 404 when the subcategory does not exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/999999999/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_NOT_FOUND");
    });

    it("returns 422 when the subcategory does not belong to the carbon inventory's methodology", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const emptyMethodology = await createEmptyMethodologyVersion(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

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
      const foreignSubcategory = await prisma.subcategory.create({
        data: {
          categoryId: category.id,
          name: "Test Subcategory",
          icon: "TRUCK",
          description: "Test Description",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${foreignSubcategory.id}/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_NOT_IN_METHODOLOGY");
    });

    it("returns 422 when manual mode is already active", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      const directLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, directLine.id, {
        inputType: "DIRECT",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MANUAL_MODE_ALREADY_ACTIVE");
    });

    it("returns 422 when deactivating manual mode but it is not active", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      // Only a non-DIRECT active line — no DIRECT line to deactivate.
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: false },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MANUAL_MODE_NOT_ACTIVE");
    });

    it("returns 422 when deactivating manual mode but there are no previous lines to restore", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      // An active DIRECT line, but no OUTDATED non-DIRECT lines to restore.
      const directLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, directLine.id, {
        inputType: "DIRECT",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: false },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("NO_LINES_TO_RESTORE");
    });
  });

  describe("Duplicate DIRECT line cleanup", () => {
    it("reactivates the most recent outdated DIRECT line and deletes older duplicates instead of creating a new one", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      // One active non-DIRECT line, so activeLines.length > 0.
      const activeLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, activeLine.id, {
        inputType: "SIMPLIFIED",
      });

      // Two OUTDATED (data-drift) DIRECT lines for the same subcategory —
      // cleanupDirectLines should keep only the most recent one.
      const olderDirectLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { status: CarbonInventoryLineStatus.OUTDATED }
      );
      await createCarbonInventoryLineInput(prisma, olderDirectLine.id, {
        inputType: "DIRECT",
      });
      const newerDirectLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId,
        { status: CarbonInventoryLineStatus.OUTDATED }
      );
      await createCarbonInventoryLineInput(prisma, newerDirectLine.id, {
        inputType: "DIRECT",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${subcategoryId}/manual-total-emissions`,
        payload: { activated: true },
      });

      expect(response.statusCode).toBe(204);

      const updatedOlder = await prisma.carbonInventoryLine.findUnique({
        where: { id: olderDirectLine.id },
      });
      const updatedNewer = await prisma.carbonInventoryLine.findUnique({
        where: { id: newerDirectLine.id },
      });
      const updatedActiveLine = await prisma.carbonInventoryLine.findUnique({
        where: { id: activeLine.id },
      });

      expect(updatedOlder?.status).toBe(CarbonInventoryLineStatus.DELETED);
      expect(updatedNewer?.status).toBe(CarbonInventoryLineStatus.ACTIVE);
      expect(updatedActiveLine?.status).toBe(
        CarbonInventoryLineStatus.OUTDATED
      );

      // Exactly one ACTIVE DIRECT line should remain for this subcategory.
      const directLines = await prisma.carbonInventoryLine.findMany({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId,
          status: CarbonInventoryLineStatus.ACTIVE,
          inputs: { some: { inputType: "DIRECT", isActive: true } },
        },
      });
      expect(directLines).toHaveLength(1);
      expect(directLines[0].id).toBe(newerDirectLine.id);
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        toggleManualTotalEmissionsService(prisma, 999999999n, 1n, true, null)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });

    it("treats a null user as an anonymous actor when activating manual mode", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      const subcategoryId = subcategoryIds[0];

      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
      });

      await toggleManualTotalEmissionsService(
        prisma,
        carbonInventory.id,
        subcategoryId,
        true,
        null
      );

      const directLine = await prisma.carbonInventoryLine.findFirst({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId,
          status: CarbonInventoryLineStatus.ACTIVE,
          inputs: { some: { inputType: "DIRECT", isActive: true } },
        },
      });
      expect(directLine?.createdById).toBeNull();
    });
  });
});
