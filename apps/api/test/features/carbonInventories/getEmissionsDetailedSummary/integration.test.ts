import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import { Prisma } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupCarbonInventoryTestData,
  createCarbonInventory,
  createCarbonInventoryLine,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

type SummarySubcategory =
  GetEmissionsDetailedSummaryResponse["categories"][number]["subcategories"][number];

describe("GET /api/carbon-inventories/:id/emissions-summary - Integration Tests", () => {
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

  /** Flattens the nested category → subcategory response into a single list. */
  const flattenSubcategories = (
    body: GetEmissionsDetailedSummaryResponse
  ): SummarySubcategory[] =>
    body.categories.flatMap((category) => category.subcategories);

  /** Creates an ACTIVE factor-based line with a computed result (complete). */
  const createCompleteLine = async (
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
      inputType: "SIMPLIFIED",
      quantity: new Prisma.Decimal(10),
    });
    await createCarbonInventoryLineResult(prisma, input.id, emissionsKg);
    return line;
  };

  /** Creates an ACTIVE factor-based line with no result (incomplete). */
  const createIncompleteLine = async (
    inventoryId: bigint,
    subcategoryId: bigint
  ) => {
    const line = await createCarbonInventoryLine(
      prisma,
      inventoryId,
      subcategoryId
    );
    await createCarbonInventoryLineInput(prisma, line.id, {
      inputType: "SIMPLIFIED",
    });
    return line;
  };

  describe("active-line visibility (complete and incomplete)", () => {
    it("shows a subcategory whose only line is incomplete", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subId] = await getSubcategoryIds(prisma, methodologyVersionId);
      const incompleteLine = await createIncompleteLine(inventory.id, subId);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      // Whole inventory has no computed emissions yet, but the pending line
      // must still surface so the user knows what is left to complete.
      expect(body.totalEmissions).toBe(0);

      const subcategories = flattenSubcategories(body);
      const subcategory = subcategories.find((s) => s.id === subId.toString());
      expect(subcategory).toBeDefined();
      expect(subcategory!.subtotal).toBe(0);
      expect(subcategory!.lines).toHaveLength(1);

      const line = subcategory!.lines[0];
      expect(line.lineId).toBe(incompleteLine.id.toString());
      expect(line.factorValue).toBeNull();
      expect(line.emissions).toBe(0);
    });

    it("shows both complete and incomplete lines within the same subcategory", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subId] = await getSubcategoryIds(prisma, methodologyVersionId);
      const completeLine = await createCompleteLine(inventory.id, subId, 1000);
      const incompleteLine = await createIncompleteLine(inventory.id, subId);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      // 1000 kg → 1 tCO2e
      expect(body.totalEmissions).toBe(1);

      const subcategory = flattenSubcategories(body).find(
        (s) => s.id === subId.toString()
      );
      expect(subcategory).toBeDefined();
      expect(subcategory!.subtotal).toBe(1);
      expect(subcategory!.lines).toHaveLength(2);

      const linesById = new Map(subcategory!.lines.map((l) => [l.lineId, l]));
      expect(linesById.get(completeLine.id.toString())?.emissions).toBe(1);
      expect(linesById.get(incompleteLine.id.toString())?.emissions).toBe(0);
    });

    it("omits subcategories with no active lines", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subAId, subBId] = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      await createCompleteLine(inventory.id, subAId, 500);
      await createIncompleteLine(inventory.id, subBId);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      // Only the two populated subcategories appear; the rest of the
      // methodology's subcategories (no active lines) are omitted.
      const subcategoryIds = flattenSubcategories(body)
        .map((s) => s.id)
        .sort();
      expect(subcategoryIds).toEqual(
        [subAId.toString(), subBId.toString()].sort()
      );
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999/emissions-summary",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
