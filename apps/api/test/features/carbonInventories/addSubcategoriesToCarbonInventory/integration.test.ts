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
} from "@test/factories/carbonInventorySeeder.js";
import {
  type AddSubcategoriesToCarbonInventoryResponse,
  CarbonInventoryLineStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  getTestMethodologyVersionId,
  createEmptyMethodologyVersion,
} from "@test/factories/methodologyFactory.js";
import { addSubcategoriesToCarbonInventoryService } from "@/features/carbonInventories/addSubcategoriesToCarbonInventory/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("POST /api/carbon-inventories/:id/subcategories/add - Integration Tests", () => {
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

  describe("Successful addition", () => {
    it("should add multiple subcategories to a carbon inventory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

      const subcategoryIdsToAdd = [
        subcategoryIds[0].toString(),
        subcategoryIds[1].toString(),
        subcategoryIds[2].toString(),
      ];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: subcategoryIdsToAdd,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as AddSubcategoriesToCarbonInventoryResponse;
      expect(body.added).toBe(3);
      expect(body.skipped).toBe(0);

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

    it("should skip subcategories that already have ACTIVE lines", async () => {
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

      const subcategoryIdsToAdd = [
        subcategoryIds[0].toString(), // Already has ACTIVE line - should be skipped
        subcategoryIds[1].toString(), // Should be added
        subcategoryIds[2].toString(), // Should be added
      ];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: subcategoryIdsToAdd,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as AddSubcategoriesToCarbonInventoryResponse;
      expect(body.added).toBe(2);
      expect(body.skipped).toBe(1);
    });

    it("should skip all subcategories if they all already have ACTIVE lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create ACTIVE lines for all subcategories
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

      const subcategoryIdsToAdd = [
        subcategoryIds[0].toString(),
        subcategoryIds[1].toString(),
      ];

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: subcategoryIdsToAdd,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as AddSubcategoriesToCarbonInventoryResponse;
      expect(body.added).toBe(0);
      expect(body.skipped).toBe(2);
    });

    it("should add a single subcategory", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      const subcategoryIdToAdd = subcategoryIds[0].toString();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: [subcategoryIdToAdd],
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as AddSubcategoriesToCarbonInventoryResponse;
      expect(body.added).toBe(1);
      expect(body.skipped).toBe(0);
    });
  });

  describe("Error cases", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when carbon inventory does not exist", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${nonExistentId}/subcategories/add`,
        payload: {
          subcategoryIds: ["1", "2", "3"],
        },
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
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: ["999999", "999998"],
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBe("One or more subcategories not found");
    });

    it("should return 422 when one or more subcategories do not belong to the carbon inventory's methodology", async () => {
      // Create two different methodologies
      const methodologyId1 = await getTestMethodologyVersionId(prisma);

      // Create an empty methodology (no subcategories) to simulate a different methodology
      // Then try to add subcategories from methodology 1 to a carbon inventory using methodology 2
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

      // Only test if there are subcategories in methodology 1
      if (subcategoryIdsFromMethodology1.length > 0) {
        const response = await app.inject({
          method: "POST",
          url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
          payload: {
            subcategoryIds: [subcategoryIdsFromMethodology1[0].toString()],
          },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("SUBCATEGORY_NOT_IN_METHODOLOGY");
        expect(body.message).toBe(
          "One or more subcategories do not belong to the carbon inventory's methodology"
        );
      }
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid carbon inventory ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/invalid-id/subcategories/add",
        payload: {
          subcategoryIds: ["1", "2", "3"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (decimal)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/123.45/subcategories/add",
        payload: {
          subcategoryIds: ["1", "2", "3"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid carbon inventory ID format (negative)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/-123/subcategories/add",
        payload: {
          subcategoryIds: ["1", "2", "3"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing subcategoryIds in body", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty subcategoryIds array", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategoryIds (non-numeric string)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: ["abc", "def"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategoryIds (decimal string)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: ["1.5", "2.7"],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid subcategoryIds (non-array)", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/subcategories/add`,
        payload: {
          subcategoryIds: "not-an-array",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        addSubcategoriesToCarbonInventoryService(prisma, 999999999n, [1n], null)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });

    it("treats a null user as an anonymous actor (createdById = null) when creating lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );
      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);

      const result = await addSubcategoriesToCarbonInventoryService(
        prisma,
        carbonInventory.id,
        [subcategoryIds[0]],
        null
      );

      expect(result.added).toBe(1);
      const line = await prisma.carbonInventoryLine.findFirst({
        where: {
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategoryIds[0],
        },
      });
      expect(line?.createdById).toBeNull();
    });
  });
});
