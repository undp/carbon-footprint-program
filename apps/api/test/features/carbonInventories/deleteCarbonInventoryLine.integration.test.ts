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
import type { DeleteCarbonInventoryLineResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type {
  NotFoundErrorResponse,
  StructuredErrorResponse,
} from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";

describe("DELETE /api/carbon-inventories/:id/subcategories/:subcategoryId/lines/:lineId - Integration Tests", () => {
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

  describe("Successful deletion", () => {
    it("should soft delete a line by changing its status to DELETED", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      // Create a line first
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // Verify the line exists and has ACTIVE status
      const activeStatus = await prisma.statusCatalog.findFirst({
        where: {
          scope: "ENTITY",
          code: "ACTIVE",
        },
      });

      expect(activeStatus).toBeDefined();
      const lineBeforeDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line.id },
      });
      expect(lineBeforeDelete?.statusId).toBe(activeStatus!.id);

      // Delete the line
      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/${line.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DeleteCarbonInventoryLineResponse;
      expect(body.message).toBe("Line deleted successfully");

      // Verify the line still exists but has DELETED status
      const deletedStatus = await prisma.statusCatalog.findFirst({
        where: {
          scope: "ENTITY",
          code: "DELETED",
        },
      });

      expect(deletedStatus).toBeDefined();
      const lineAfterDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line.id },
      });
      expect(lineAfterDelete).toBeDefined();
      expect(lineAfterDelete?.statusId).toBe(deletedStatus!.id);
    });

    it("should successfully delete multiple lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      // Create two lines
      const line1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );
      const line2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // Delete first line
      const response1 = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/${line1.id}`,
      });

      expect(response1.statusCode).toBe(200);

      // Delete second line
      const response2 = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/${line2.id}`,
      });

      expect(response2.statusCode).toBe(200);

      // Verify both lines have DELETED status
      const deletedStatus = await prisma.statusCatalog.findFirst({
        where: {
          scope: "ENTITY",
          code: "DELETED",
        },
      });

      expect(deletedStatus).toBeDefined();
      const line1AfterDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line1.id },
      });
      const line2AfterDelete = await prisma.carbonInventoryLine.findUnique({
        where: { id: line2.id },
      });

      expect(line1AfterDelete?.statusId).toBe(deletedStatus!.id);
      expect(line2AfterDelete?.statusId).toBe(deletedStatus!.id);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when line does not exist (optimized: single query cannot distinguish missing entities)", async () => {
      const nonExistentId = "999999";
      const subcategoryId = "1";
      const lineId = "999999";

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${nonExistentId}/subcategories/${subcategoryId}/lines/${lineId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Line not found");
    });

    it("should return 404 when line does not exist for valid carbon inventory and subcategory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];
      const nonExistentLineId = "999999";

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/${nonExistentLineId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Line not found");
    });

    it("should return 404 when line is already deleted (deleted lines should not be visible)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      // Create a line
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // Get DELETED status
      const deletedStatus = await prisma.statusCatalog.findFirst({
        where: {
          scope: "ENTITY",
          code: "DELETED",
        },
      });

      expect(deletedStatus).toBeDefined();

      // Manually delete the line by setting its status to DELETED
      await prisma.carbonInventoryLine.update({
        where: { id: line.id },
        data: { statusId: deletedStatus!.id },
      });

      // Try to delete the already-deleted line
      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/${line.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as NotFoundErrorResponse;
      expect(body.message).toBe("Line not found");
    });

    it("should return 422 when line does not belong to the carbon inventory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);

      // Create two carbon inventories
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
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const firstSubcategoryId = subcategoryIds[0];

      // Create a line in carbon inventory 1
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory1.id,
        firstSubcategoryId
      );

      // Try to delete the line using carbon inventory 2
      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory2.id}/subcategories/${firstSubcategoryId}/lines/${line.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as StructuredErrorResponse;
      expect(body.code).toBe("LINE_NOT_IN_CARBON_INVENTORY");
      expect(body.message).toBe("Line does not belong to the carbon inventory");
    });

    it("should return 422 when line does not belong to the subcategory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(1); // Need at least 2 subcategories

      const firstSubcategoryId = subcategoryIds[0];
      const secondSubcategoryId = subcategoryIds[1];

      // Create a line in first subcategory
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        firstSubcategoryId
      );

      // Try to delete the line using second subcategory
      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${secondSubcategoryId}/lines/${line.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as StructuredErrorResponse;
      expect(body.code).toBe("LINE_NOT_IN_SUBCATEGORY");
      expect(body.message).toBe("Line does not belong to the subcategory");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid carbon inventory ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/carbon-inventories/invalid-id/subcategories/1/lines/1",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (decimal)", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/carbon-inventories/123.45/subcategories/1/lines/1",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (negative)", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/carbon-inventories/-123/subcategories/1/lines/1",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (non-numeric)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/invalid-id/lines/1`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (decimal)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/123.45/lines/1`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategory ID format (negative)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/-123/lines/1`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid line ID format (non-numeric)", async () => {
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
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/invalid-id`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid line ID format (decimal)", async () => {
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
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/123.45`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid line ID format (negative)", async () => {
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
        method: "DELETE",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/${firstSubcategoryId}/lines/-123`,
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
