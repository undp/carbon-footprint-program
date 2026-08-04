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
  createCarbonInventoryLineResult,
  createCarbonInventoryLineFactor,
} from "@test/factories/carbonInventorySeeder.js";
import type { DuplicateCarbonInventoryResponse } from "@repo/types";
import { CarbonInventoryLineStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import { Prisma, type PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { duplicateCarbonInventoryService } from "@/features/carbonInventories/duplicateCarbonInventory/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("POST /api/carbon-inventories/:id/duplicate - Integration Tests", () => {
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

  describe("Successful duplication", () => {
    it("should duplicate a carbon inventory and return the new ID", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;
      expect(body.id).toBeTruthy();
      expect(body.id).not.toBe(inventory.id.toString());

      // Verify the new inventory exists in the database
      const newInventory = await prisma.carbonInventory.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(newInventory).toBeDefined();
      expect(newInventory?.usageMode).toBe(inventory.usageMode);
      expect(newInventory?.status).toBe("ACTIVE");
      expect(newInventory?.isEditable).toBe(true);
      expect(newInventory?.updatedAt).toBeNull();
      expect(newInventory?.updatedById).toBeNull();
    });

    it("should duplicate inventory fields correctly", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        {
          name: "Test Inventory",
          year: 2024,
          methodologyVersionId,
          organizationData: {
            name: "Test Org",
            sectorId: "1",
            subsectorId: "2",
            sizeId: "3",
            mainActivityId: "4",
            mainActivityQuantity: 100,
          },
        }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newInventory = await prisma.carbonInventory.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(newInventory?.name).toBe("Test Inventory (1)");
      expect(newInventory?.year).toBe(2024);
      expect(newInventory?.usageMode).toBe("SIMPLIFIED");
      expect(newInventory?.methodologyVersionId).toBe(methodologyVersionId);
      expect(newInventory?.status).toBe("ACTIVE");

      // Verify organizationData was copied
      const orgData = newInventory?.organizationData as Record<string, unknown>;
      expect(orgData).toBeDefined();
      expect(orgData.name).toBe("Test Org");
      expect(orgData.sectorId).toBe("1");
      expect(orgData.subsectorId).toBe("2");
      expect(orgData.sizeId).toBe("3");
      expect(orgData.mainActivityId).toBe("4");
      expect(orgData.mainActivityQuantity).toBe(100);
    });

    it("should duplicate ACTIVE lines and their inputs", async () => {
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

      // Create an ACTIVE line with an input
      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(5000),
        comment: "Test comment",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      // Verify lines were duplicated
      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
        include: { inputs: true },
      });

      expect(newLines).toHaveLength(1);
      expect(newLines[0].subcategoryId).toBe(subcategoryIds[0]);
      expect(newLines[0].status).toBe(CarbonInventoryLineStatus.ACTIVE);
      expect(newLines[0].updatedAt).toBeNull();
      expect(newLines[0].updatedById).toBeNull();

      // Verify inputs were duplicated
      expect(newLines[0].inputs).toHaveLength(1);
      expect(newLines[0].inputs[0].inputType).toBe("DIRECT");
      expect(Number(newLines[0].inputs[0].directTotalEmissions)).toBe(5000);
      expect(newLines[0].inputs[0].comment).toBe("Test comment");
      expect(newLines[0].inputs[0].isActive).toBe(true);
      expect(newLines[0].inputs[0].updatedAt).toBeNull();
      expect(newLines[0].inputs[0].updatedById).toBeNull();
    });

    it("should duplicate line results", async () => {
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

      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(3000),
      });
      await createCarbonInventoryLineResult(prisma, input.id, 3000);

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      // Verify results were duplicated
      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
        include: {
          inputs: {
            include: { result: true },
          },
        },
      });

      expect(newLines).toHaveLength(1);
      expect(newLines[0].inputs[0].result).toBeDefined();
      expect(Number(newLines[0].inputs[0].result?.totalEmissions)).toBe(3000);
    });

    it("should duplicate line factors", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );

      const rateMeasurementUnit =
        await prisma.rateMeasurementUnit.findFirstOrThrow();

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(2000),
      });
      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(1.5),
        appliedFactorRateUnitId: rateMeasurementUnit.id,
        appliedFactorSource: "Test source",
      });
      await createCarbonInventoryLineResult(prisma, input.id, 2000);

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
        include: {
          inputs: {
            include: { result: true, factor: true },
          },
        },
      });

      expect(newLines).toHaveLength(1);
      expect(newLines[0].inputs[0].factor).toBeDefined();
      expect(Number(newLines[0].inputs[0].factor?.appliedFactorValue)).toBe(
        1.5
      );
      expect(newLines[0].inputs[0].factor?.appliedFactorRateUnitId).toBe(
        rateMeasurementUnit.id
      );
      expect(newLines[0].inputs[0].factor?.appliedFactorSource).toBe(
        "Test source"
      );
    });

    it("should duplicate a factor's derivationDetails when present", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const rateMeasurementUnit =
        await prisma.rateMeasurementUnit.findFirstOrThrow();

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId }
      );

      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(2000),
      });
      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(1.5),
        appliedFactorRateUnitId: rateMeasurementUnit.id,
        derivationDetails: { note: "derived value" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
        include: { inputs: { include: { factor: true } } },
      });

      expect(newLines[0].inputs[0].factor?.derivationDetails).toEqual({
        note: "derived value",
      });
    });

    it("should NOT duplicate DELETED or OUTDATED lines", async () => {
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

      // Create ACTIVE line
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[0], {
        status: CarbonInventoryLineStatus.ACTIVE,
      });

      // Create DELETED line
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[1], {
        status: CarbonInventoryLineStatus.DELETED,
      });

      // Create OUTDATED line
      await createCarbonInventoryLine(prisma, inventory.id, subcategoryIds[0], {
        status: CarbonInventoryLineStatus.OUTDATED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
      });

      // Only the ACTIVE line should be duplicated
      expect(newLines).toHaveLength(1);
      expect(newLines[0].status).toBe(CarbonInventoryLineStatus.ACTIVE);
    });

    it("should NOT duplicate inactive inputs", async () => {
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

      const line = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subcategoryIds[0]
      );

      // Create active input
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(1000),
        isActive: true,
      });

      // Create inactive input
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
        directTotalEmissions: new Prisma.Decimal(2000),
        isActive: false,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
        include: { inputs: true },
      });

      // Only the active input should be duplicated
      expect(newLines[0].inputs).toHaveLength(1);
      expect(Number(newLines[0].inputs[0].directTotalEmissions)).toBe(1000);
    });

    it("should duplicate an inventory with no lines", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as DuplicateCarbonInventoryResponse;

      const newLines = await prisma.carbonInventoryLine.findMany({
        where: { carbonInventoryId: BigInt(body.id) },
      });
      expect(newLines).toHaveLength(0);
    });
  });

  describe("Error cases", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/999999/duplicate",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/abc/duplicate",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 403 when inventory was DELETED", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      await prisma.carbonInventory.update({
        where: { id: inventory.id },
        data: { status: "DELETED" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/duplicate`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent (or DELETED) inventory before the service is ever
    // reached, so exercise the service's own not-found guard directly against
    // the real database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        duplicateCarbonInventoryService(prisma, "999999999", null)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });

    it("treats a null/undefined user as an anonymous actor (createdById = null)", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const result = await duplicateCarbonInventoryService(
        prisma,
        inventory.id.toString(),
        null
      );

      const newInventory = await prisma.carbonInventory.findUnique({
        where: { id: BigInt(result.id) },
      });
      expect(newInventory?.createdById).toBeNull();
    });
  });
});
