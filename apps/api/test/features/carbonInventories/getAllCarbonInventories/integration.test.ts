import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  buildExpectedOrganizationData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
  createCarbonInventories,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { type GetAllCarbonInventoriesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  CarbonInventoryLineStatus,
  Prisma,
  type PrismaClient,
} from "@repo/database";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/carbon-inventories - Integration Tests", () => {
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
    await cleanupTestOrganization(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return an empty array when no carbon inventories exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it("should return carbon inventories when they exist", async () => {
      // Create test carbon inventories
      await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
    });
  });

  describe("Ordering", () => {
    it("should return inventories ordered by creation date (newest first)", async () => {
      // Create multiple inventories with different creation times
      const inventory1 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2022 }
      );

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const inventory2 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.expertDraft,
        { year: 2023 }
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      const inventory3 = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2024 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(3);

      // Newest first (inventory3, inventory2, inventory1)
      expect(body[0].id).toBe(inventory3.id.toString());
      expect(body[1].id).toBe(inventory2.id.toString());
      expect(body[2].id).toBe(inventory1.id.toString());

      // Verify timestamps are in descending order
      expect(new Date(body[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(body[1].createdAt).getTime()
      );
      expect(new Date(body[1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(body[2].createdAt).getTime()
      );
    });
  });

  describe("Data integrity", () => {
    it("should have unique IDs", async () => {
      // Create multiple inventories
      await createCarbonInventories(prisma, [
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2022 },
        { ...carbonInventoryPatterns.expertDraft(), year: 2023 },
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2024 },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      const ids = body.map((inv) => inv.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("Response data mapping", () => {
    it("should correctly map all fields including nullable ones", async () => {
      const { id: userId } = await getTestLoggedUser(prisma);
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Get a seeded organization to satisfy foreign key constraint
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const testInventory = await createInventoryFromPattern(prisma, () => ({
        organizationId,
        organizationBranchId: BigInt(456),
        organizationData: {
          name: "Test Org",
          sectorId: "1",
          subsectorId: "2",
          sizeId: "3",
          mainActivityId: "4",
          mainActivityQuantity: 100,
        },
        year: 2024,
        usageMode: "EXPERT",
        methodologyVersionId: BigInt(methodologyVersionId),
        preselectedNodesId: BigInt(111),
        isEditable: true,
      }));

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(1);

      const inventory = body[0];
      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        {
          name: "Test Org",
          sectorId: "1",
          subsectorId: "2",
          sizeId: "3",
          mainActivityId: "4",
          mainActivityQuantity: 100,
        },
        { resolveReferences: false }
      );
      expect(inventory.id).toBe(testInventory.id.toString());
      expect(inventory.organizationId).toBe(organizationId.toString());
      expect(inventory.organizationBranchId).toBe("456");
      expect(inventory.organizationData).toEqual(expectedOrganizationData);
      expect(inventory.year).toBe(2024);
      expect(inventory.status).toBe("DRAFT");
      expect(inventory.usageMode).toBe("EXPERT");
      expect(inventory.methodologyVersionId).toBe(
        methodologyVersionId.toString()
      );
      expect(inventory.preselectedNodesId).toBe("111");
      expect(inventory.isEditable).toBe(true);
      expect(inventory.createdById).toBe(userId.toString());
      expect(inventory.updatedById).toBeNull();
      expect(inventory.createdAt).toBeTruthy();
      expect(inventory.updatedAt).toBeNull();
    });

    it("should correctly handle null values", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const { id: userId } = await getTestLoggedUser(prisma);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(1);

      const inventory = body[0];
      expect(inventory.id).toBe(testInventory.id.toString());
      expect(inventory.organizationId).toBeNull();
      expect(inventory.organizationBranchId).toBeNull();
      expect(inventory.organizationData).toBeNull();
      expect(inventory.methodologyVersionId).toBe(
        methodologyVersionId.toString()
      );
      expect(inventory.preselectedNodesId).toBeNull();
      expect(inventory.createdById).toBe(userId.toString());
      expect(inventory.updatedById).toBeNull();
    });
  });

  describe("Different usage modes", () => {
    it("should return inventories with different usage modes", async () => {
      await createCarbonInventories(prisma, [
        carbonInventoryPatterns.simplifiedDraft(),
        carbonInventoryPatterns.expertDraft(),
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(2);

      const usageModes = body.map((inv) => inv.usageMode);
      expect(usageModes).toContain("SIMPLIFIED");
      expect(usageModes).toContain("EXPERT");
    });
  });

  describe("Year filtering", () => {
    beforeEach(async () => {
      // Create inventories for different years
      await createCarbonInventories(prisma, [
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2022 },
        { ...carbonInventoryPatterns.expertDraft(), year: 2022 },
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2023 },
        { ...carbonInventoryPatterns.expertDraft(), year: 2024 },
        { ...carbonInventoryPatterns.simplifiedDraft(), year: 2024 },
      ]);
    });

    it("should return all inventories when year parameter is not provided", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(5);
    });

    it("should filter inventories by year 2022", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories?year=2022",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(2);
      expect(body.every((inv) => inv.year === 2022)).toBe(true);
    });

    it("should filter inventories by year 2023", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories?year=2023",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(1);
      expect(body[0].year).toBe(2023);
    });

    it("should filter inventories by year 2024", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories?year=2024",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(2);
      expect(body.every((inv) => inv.year === 2024)).toBe(true);
    });

    it("should return empty array when filtering by year with no inventories", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories?year=2025",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body.length).toBe(0);
    });
  });

  describe("hasCompletedLines flag", () => {
    it("should be false when the inventory has no lines", async () => {
      await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(false);
    });

    it("should be false when an ACTIVE line has no input", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const [subcategoryId] = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryId);

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(false);
    });

    it("should be false when an ACTIVE line has an input but no result", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const [subcategoryId] = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryId
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(1000),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(false);
    });

    it("should be true when every ACTIVE line has a calculated result", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      for (const subcategoryId of subcategoryIds.slice(0, 2)) {
        const line = await createCarbonInventoryLine(
          prisma,
          inventory.id,
          subcategoryId
        );
        const input = await createCarbonInventoryLineInput(prisma, line.id, {
          inputType: "DIRECT",
          directTotalEmissions: new Prisma.Decimal(1000),
        });
        await createCarbonInventoryLineResult(prisma, input.id, 1000);
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(true);
    });

    it("should be false when at least one ACTIVE line is missing a result", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      // First line: complete (input + result).
      const completeLine = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const completeInput = await createCarbonInventoryLineInput(
        prisma,
        completeLine.id,
        {
          inputType: "DIRECT",
          directTotalEmissions: new Prisma.Decimal(1000),
        }
      );
      await createCarbonInventoryLineResult(prisma, completeInput.id, 1000);

      // Second line: input without a result.
      const incompleteLine = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[1]
      );
      await createCarbonInventoryLineInput(prisma, incompleteLine.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(2000),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(false);
    });

    it("should ignore non-ACTIVE lines", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      // Active line with a result.
      const activeLine = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const activeInput = await createCarbonInventoryLineInput(
        prisma,
        activeLine.id,
        {
          inputType: "DIRECT",
          directTotalEmissions: new Prisma.Decimal(1000),
        }
      );
      await createCarbonInventoryLineResult(prisma, activeInput.id, 1000);

      // Deleted line without a result must not flip the flag to false.
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[1], {
        status: CarbonInventoryLineStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories",
      });

      const body = JSON.parse(response.body) as GetAllCarbonInventoriesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].hasCompletedLines).toBe(true);
    });
  });
});
