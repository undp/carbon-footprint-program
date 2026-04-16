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
  type UpdateCarbonInventorySubcategoriesResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, Prisma } from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ApiErrorResponse,
} from "@/commonSchemas/errors.js";
import {
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";

describe("PATCH /api/carbon-inventories/:id/subcategories - Integration Tests", () => {
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

  describe("Successful updates", () => {
    it("should add multiple subcategories to a carbon inventory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: true,
          },
          {
            id: subcategoryIds[1].toString(),
            selected: true,
          },
          {
            id: subcategoryIds[2].toString(),
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(3);
      expect(body.removed).toBe(0);
      expect(body.skipped).toBe(0);

      // Verify lines were created in the database
      const createdLines = await prisma.carbonInventoryLine.findMany({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId: {
            in: subcategoryIds.slice(0, 3),
          },
          status: CarbonInventoryLineStatus.ACTIVE,
        },
      });

      expect(createdLines.length).toBe(3);
    });

    it("should remove empty lines when deselecting subcategories", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create ACTIVE lines for subcategories (empty lines)
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
          {
            id: subcategoryIds[1].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(0);
      expect(body.removed).toBe(2);
      expect(body.skipped).toBe(0);

      // Verify lines were soft deleted
      const deletedLines = await prisma.carbonInventoryLine.findMany({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId: {
            in: subcategoryIds.slice(0, 2),
          },
          status: CarbonInventoryLineStatus.DELETED,
        },
      });

      expect(deletedLines.length).toBe(2);
    });

    it("should skip subcategories that already have ACTIVE lines when selecting", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

      // Create an ACTIVE line for the first subcategory
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(), // Already has ACTIVE line - should be skipped
            selected: true,
          },
          {
            id: subcategoryIds[1].toString(), // Should be added
            selected: true,
          },
          {
            id: subcategoryIds[2].toString(), // Should be added
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(2);
      expect(body.removed).toBe(0);
      expect(body.skipped).toBe(1);
    });

    it("should skip subcategories that don't have lines when deselecting", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create an ACTIVE line for only the first subcategory
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(), // Has line - should be removed
            selected: false,
          },
          {
            id: subcategoryIds[1].toString(), // No line - should be skipped
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(0);
      expect(body.removed).toBe(1);
      expect(body.skipped).toBe(1);
    });

    it("should handle mixed add and remove operations", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(4);

      // Create ACTIVE lines for first two subcategories
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(), // Has line - remove
            selected: false,
          },
          {
            id: subcategoryIds[1].toString(), // Has line - keep (selected: true)
            selected: true,
          },
          {
            id: subcategoryIds[2].toString(), // No line - add
            selected: true,
          },
          {
            id: subcategoryIds[3].toString(), // No line - skip (selected: false, but no line exists)
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(1);
      expect(body.removed).toBe(1);
      expect(body.skipped).toBe(2); // subcategoryIds[1] already selected, subcategoryIds[3] already deselected
    });

    it("should delete all empty lines when a subcategory has multiple empty lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create multiple ACTIVE empty lines for the same subcategory
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
      const line3 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(0);
      // body.removed counts removed subcategories (not individual lines).
      // Note that deletedLines.length (from prisma.carbonInventoryLine queries using getDeletedStatusId)
      // shows the number of lines soft-deleted, which may be multiple lines per subcategory.
      expect(body.removed).toBe(1); // One subcategory removed
      expect(body.skipped).toBe(0);

      // Verify all lines were soft deleted
      const deletedLines = await prisma.carbonInventoryLine.findMany({
        where: {
          id: {
            in: [line1.id, line2.id, line3.id],
          },
          status: CarbonInventoryLineStatus.DELETED,
        },
      });

      expect(deletedLines.length).toBe(3); // All three lines deleted
    });

    it("should skip adding if subcategory already has at least one ACTIVE line", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create one ACTIVE line for the subcategory
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateCarbonInventorySubcategoriesResponse;
      expect(body.added).toBe(0);
      expect(body.removed).toBe(0);
      expect(body.skipped).toBe(1);

      // Verify no additional lines were created
      const lines = await prisma.carbonInventoryLine.findMany({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategoryIds[0],
          status: CarbonInventoryLineStatus.ACTIVE,
        },
      });

      expect(lines.length).toBe(1); // Still only one line
    });
  });

  describe("Error cases", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when carbon inventory does not exist", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${nonExistentId}/subcategories`,
        payload: [
          {
            id: "1",
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 404 when one or more subcategories do not exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: "999999",
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBe("One or more subcategories not found");
    });

    it("should return 422 when one or more subcategories do not belong to the carbon inventory's methodology", async () => {
      // Create two different methodologies
      const methodologyId1 = await getTestMethodologyVersionId(prisma);

      // Create an empty methodology (no subcategories) to simulate a different methodology
      const methodologyId2 = (await createEmptyMethodologyVersion(prisma)).id;

      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId2 }
      );

      // Get subcategories from methodology 1 (which has subcategories)
      const subcategoryIdsFromMethodology1 = await getSubcategoryIds(
        prisma,
        methodologyId1
      );

      // Ensure there are subcategories in methodology 1 before proceeding
      expect(subcategoryIdsFromMethodology1.length).toBeGreaterThan(0);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIdsFromMethodology1[0].toString(),
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_NOT_IN_METHODOLOGY");
      expect(body.message).toBe(
        "One or more subcategories do not belong to the carbon inventory's methodology"
      );
    });

    it("should return 422 when trying to remove a subcategory with non-empty lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create a line with data (non-empty line)
      const line = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Add an input with quantity to make it non-empty
      await createCarbonInventoryLineInput(prisma, line.id, {
        quantity: new Prisma.Decimal(100),
        isActive: true,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_HAS_NON_EMPTY_LINES");
      expect(body.message).toBe(
        "Cannot remove subcategory with non-empty lines. Please delete or empty the lines first."
      );
    });

    it("should return 422 when trying to remove multiple subcategories and one has non-empty lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create empty line for first subcategory
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Create non-empty line for second subcategory
      const line2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1]
      );
      await createCarbonInventoryLineInput(prisma, line2.id, {
        quantity: new Prisma.Decimal(100),
        isActive: true,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
          {
            id: subcategoryIds[1].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_HAS_NON_EMPTY_LINES");
    });

    it("should return 422 when trying to remove a subcategory with multiple lines where one is non-empty", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create multiple lines for the same subcategory
      const emptyLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      const emptyLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );
      const nonEmptyLine = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0]
      );

      // Add data to one line to make it non-empty
      await createCarbonInventoryLineInput(prisma, nonEmptyLine.id, {
        quantity: new Prisma.Decimal(100),
        isActive: true,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_HAS_NON_EMPTY_LINES");

      // Verify no lines were deleted (transaction rolled back)
      const activeLines = await prisma.carbonInventoryLine.findMany({
        where: {
          id: {
            in: [emptyLine1.id, emptyLine2.id, nonEmptyLine.id],
          },
          status: CarbonInventoryLineStatus.ACTIVE,
        },
      });

      expect(activeLines.length).toBe(3); // All lines still active
    });

    it("should return 422 when trying to remove a subcategory with multiple non-empty lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create multiple non-empty lines for the same subcategory
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

      // Add data to both lines
      await createCarbonInventoryLineInput(prisma, line1.id, {
        quantity: new Prisma.Decimal(100),
        isActive: true,
      });
      await createCarbonInventoryLineInput(prisma, line2.id, {
        comment: "Test comment",
        isActive: true,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBCATEGORY_HAS_NON_EMPTY_LINES");
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid carbon inventory ID format", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/invalid-id/subcategories",
        payload: [
          {
            id: "1",
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing body", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty array", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for duplicate subcategory IDs", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            selected: true,
          },
          {
            id: subcategoryIds[0].toString(),
            selected: false,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toContain("Duplicate subcategory IDs");
    });

    it("should return 400 for invalid subcategory ID format", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: "invalid",
            selected: true,
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing selected field", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories`,
        payload: [
          {
            id: subcategoryIds[0].toString(),
            // missing selected field
          },
        ],
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
