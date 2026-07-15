import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createCarbonInventory,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetSuggestedReductionPlanResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { Prisma, type PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/suggested-reduction-plan - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return a suggested reduction plan for a valid inventory", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/suggested-reduction-plan",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Ranking, tie-breaking, and initiative selection", () => {
    // The seeded dataset ships with reduction-plan initiatives already attached
    // to subcategories; clear them so each test controls its own fixtures.
    beforeEach(async () => {
      await prisma.reductionPlanInitiative.deleteMany({});
    });
    afterEach(async () => {
      await prisma.reductionPlanInitiative.deleteMany({});
    });

    const createLineWithEmissions = async (
      inventoryId: bigint,
      subcategoryId: bigint,
      emissionsKg: number
    ) => {
      const line = await createCarbonInventoryLine(
        prisma,
        inventoryId,
        subcategoryId
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(emissionsKg),
      });
      await createCarbonInventoryLineResult(prisma, input.id, emissionsKg);
      return line;
    };

    it("breaks a subtotal tie by category position when subcategories are in different categories", async () => {
      const subcategories = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        include: { category: { select: { position: true } } },
        orderBy: { id: "asc" },
      });
      const subA = subcategories[0];
      const subB = subcategories.find(
        (s) => s.category.position !== subA.category.position
      );
      if (!subB) {
        throw new Error(
          "Expected subcategories spanning at least 2 categories"
        );
      }

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      // Equal subtotals force the sort to fall through to the categoryPosition tiebreak.
      await createLineWithEmissions(inventory.id, subA.id, 1000);
      await createLineWithEmissions(inventory.id, subB.id, 1000);

      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subA.id,
          title: `Init-${subA.id}`,
          description: "Desc",
          updatedAt: null,
        },
      });
      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subB.id,
          title: `Init-${subB.id}`,
          description: "Desc",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;
      expect(body).toHaveLength(2);

      const [lowerPositionSub, higherPositionSub] =
        subA.category.position < subB.category.position
          ? [subA, subB]
          : [subB, subA];
      expect(body[0].title).toBe(`Init-${lowerPositionSub.id}`);
      expect(body[1].title).toBe(`Init-${higherPositionSub.id}`);
    });

    it("breaks a subtotal and category-position tie by subcategory name", async () => {
      const subcategoriesByCategory = await prisma.category.findMany({
        where: { methodologyVersionId },
        select: {
          subcategories: { select: { id: true, name: true }, take: 2 },
        },
      });
      const categoryWithTwoSubs = subcategoriesByCategory.find(
        (c) => c.subcategories.length >= 2
      );
      if (!categoryWithTwoSubs) {
        throw new Error(
          "Expected a category with at least 2 subcategories in the test methodology"
        );
      }
      const [subA, subB] = categoryWithTwoSubs.subcategories;

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createLineWithEmissions(inventory.id, subA.id, 1000);
      await createLineWithEmissions(inventory.id, subB.id, 1000);

      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subA.id,
          title: `Init-${subA.id}`,
          description: "Desc",
          updatedAt: null,
        },
      });
      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subB.id,
          title: `Init-${subB.id}`,
          description: "Desc",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;
      expect(body).toHaveLength(2);

      const [firstByName, secondByName] =
        subA.name.localeCompare(subB.name) <= 0 ? [subA, subB] : [subB, subA];
      expect(body[0].title).toBe(`Init-${firstByName.id}`);
      expect(body[1].title).toBe(`Init-${secondByName.id}`);
    });

    it("skips a ranked subcategory that has computed emissions but no matching initiatives", async () => {
      const subcategories = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        orderBy: { id: "asc" },
        take: 2,
      });
      const [withInitiative, withoutInitiative] = subcategories;

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      // Distinct subtotals so ranking order is unambiguous.
      await createLineWithEmissions(inventory.id, withInitiative.id, 2000);
      await createLineWithEmissions(inventory.id, withoutInitiative.id, 1000);

      await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: withInitiative.id,
          title: "Only initiative",
          description: "Desc",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe("Only initiative");
    });

    it("returns every initiative for a subcategory in id order", async () => {
      const [subcategory] = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        orderBy: { id: "asc" },
        take: 1,
      });

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createLineWithEmissions(inventory.id, subcategory.id, 1000);

      const first = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subcategory.id,
          title: "First",
          description: "Desc",
          updatedAt: null,
        },
      });
      const second = await prisma.reductionPlanInitiative.create({
        data: {
          subcategoryId: subcategory.id,
          title: "Second",
          description: "Desc",
          updatedAt: null,
        },
      });
      expect(second.id > first.id).toBe(true);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;
      expect(body).toHaveLength(2);
      expect(body[0].title).toBe("First");
      expect(body[1].title).toBe("Second");
    });

    it("honors the limit query parameter and stops once it is reached", async () => {
      const [subcategory] = await prisma.subcategory.findMany({
        where: { category: { methodologyVersionId } },
        orderBy: { id: "asc" },
        take: 1,
      });

      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      await createLineWithEmissions(inventory.id, subcategory.id, 1000);

      for (const title of ["First", "Second", "Third"]) {
        await prisma.reductionPlanInitiative.create({
          data: {
            subcategoryId: subcategory.id,
            title,
            description: "Desc",
            updatedAt: null,
          },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/suggested-reduction-plan?limit=2`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetSuggestedReductionPlanResponse;
      expect(body).toHaveLength(2);
      expect(body[0].title).toBe("First");
      expect(body[1].title).toBe("Second");
    });
  });
});
