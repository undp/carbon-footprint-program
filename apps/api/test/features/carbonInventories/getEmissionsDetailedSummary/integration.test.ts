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
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { IconNameSchema } from "@repo/types";
import type {
  GetEmissionsDetailedSummaryResponse,
  OrganizationDataField,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import type {
  InventoryBase,
  CategoryData,
} from "@/features/carbonInventories/helpers.js";
import {
  resolveInventoryAttributes,
  calculateEquivalence,
  buildGHGBreakdown,
} from "@/features/carbonInventories/getEmissionsDetailedSummary/helper.js";

type SummarySubcategory =
  GetEmissionsDetailedSummaryResponse["categories"][number]["subcategories"][number];

describe("GET /api/carbon-inventories/:id/emissions-summary - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let methodologyVersionId: bigint;
  let rateUnitId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);

    // Any seeded rate unit works as the factor's applied rate unit (FK target).
    const rateUnit = await prisma.rateMeasurementUnit.findFirst({
      select: { id: true },
    });
    if (!rateUnit) {
      throw new Error("No RateMeasurementUnit seeded for testing");
    }
    rateUnitId = rateUnit.id;
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
      expect(subcategory!.hasIncompleteLines).toBe(true);
      // The containing category is provisional too.
      expect(
        body.categories.find((c) =>
          c.subcategories.some((s) => s.id === subId.toString())
        )?.hasIncompleteLines
      ).toBe(true);
      expect(subcategory!.lines).toHaveLength(1);

      const line = subcategory!.lines[0];
      expect(line.lineId).toBe(incompleteLine.id.toString());
      expect(line.factorValue).toBeNull();
      // No computed result yet → null (renders as "—"), not a misleading 0.
      expect(line.emissions).toBeNull();
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
      expect(subcategory!.hasIncompleteLines).toBe(true);
      expect(subcategory!.lines).toHaveLength(2);

      const linesById = new Map(subcategory!.lines.map((l) => [l.lineId, l]));
      expect(linesById.get(completeLine.id.toString())?.emissions).toBe(1);
      expect(linesById.get(incompleteLine.id.toString())?.emissions).toBeNull();
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

    it("exposes factor details for a completed factor-based line", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subId] = await getSubcategoryIds(prisma, methodologyVersionId);

      const line = await createCarbonInventoryLine(prisma, inventory.id, subId);
      const input = await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "SIMPLIFIED",
        quantity: new Prisma.Decimal(10),
      });
      await createCarbonInventoryLineFactor(prisma, input.id, {
        appliedFactorValue: new Prisma.Decimal(2.5),
        appliedFactorRateUnitId: rateUnitId,
        appliedFactorSource: "IPCC 2019",
      });
      await createCarbonInventoryLineResult(prisma, input.id, 1000);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      const subcategory = flattenSubcategories(body).find(
        (s) => s.id === subId.toString()
      );
      expect(subcategory).toBeDefined();

      const lineRow = subcategory!.lines.find(
        (l) => l.lineId === line.id.toString()
      );
      expect(lineRow).toBeDefined();
      expect(subcategory!.hasIncompleteLines).toBe(false);
      expect(
        body.categories.find((c) =>
          c.subcategories.some((s) => s.id === subId.toString())
        )?.hasIncompleteLines
      ).toBe(false);
      expect(lineRow!.quantity).toBe(10);
      expect(lineRow!.factorValue).toBe(2.5);
      expect(lineRow!.factorSource).toBe("IPCC 2019");
      expect(lineRow!.emissions).toBe(1); // 1000 kg → 1 tCO2e
    });

    it("includes an incomplete total-mode (DIRECT) subcategory as a manual row", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subId] = await getSubcategoryIds(prisma, methodologyVersionId);

      // Total-mode entry the user started but hasn't filled: a DIRECT input
      // with no directTotalEmissions and no result.
      const line = await createCarbonInventoryLine(prisma, inventory.id, subId);
      await createCarbonInventoryLineInput(prisma, line.id, {
        inputType: "DIRECT",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      expect(body.totalEmissions).toBe(0);

      const subcategory = flattenSubcategories(body).find(
        (s) => s.id === subId.toString()
      );
      expect(subcategory).toBeDefined();
      expect(subcategory!.hasLines).toBe(false);
      expect(subcategory!.lines).toHaveLength(1);
      const emittedLine = subcategory!.lines[0];
      expect(emittedLine.lineId).toBe(line.id.toString());
      expect(emittedLine.emissions).toBeNull();
      expect(subcategory!.subtotal).toBe(0);
      // Provisional: the total-mode entry has no result yet.
      expect(subcategory!.hasIncompleteLines).toBe(true);
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

    it("should return 500 DATA_INTEGRITY_ERROR when organizationData fails schema validation", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      // `.strict()` schema rejects unknown keys — write a value that bypasses
      // app-level validation directly through Prisma to simulate corrupted data.
      await prisma.carbonInventory.update({
        where: { id: inventory.id },
        data: { organizationData: { unexpectedField: "oops" } },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("DATA_INTEGRITY_ERROR");
    });
  });

  describe("Lines without an active input", () => {
    it("excludes a line that has no active input from the response's lines list", async () => {
      const inventory = await createCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
      });
      const [subId] = await getSubcategoryIds(prisma, methodologyVersionId);
      const completeLine = await createCompleteLine(inventory.id, subId, 1000);
      // A raw line with zero inputs (e.g. created via "add subcategory") still
      // counts as an ACTIVE line for the subtotals view, but has no input row.
      const emptyLine = await createCarbonInventoryLine(
        prisma,
        inventory.id,
        subId
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/emissions-summary`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetEmissionsDetailedSummaryResponse;

      const subcategory = flattenSubcategories(body).find(
        (s) => s.id === subId.toString()
      );
      expect(subcategory).toBeDefined();
      const lineIds = subcategory!.lines.map((l) => l.lineId);
      expect(lineIds).toContain(completeLine.id.toString());
      expect(lineIds).not.toContain(emptyLine.id.toString());
    });
  });

  describe("resolveInventoryAttributes (unit)", () => {
    it("resolves sector, subsector, size, and main activity names, preferring the organization summary name for companyName", async () => {
      const sector = await prisma.countrySector.findFirst();
      const subsector = await prisma.countrySubsector.findFirst();
      const size = await prisma.countryOrganizationSize.findFirst();
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      if (!sector || !subsector || !size || !mainActivity) {
        throw new Error("Expected seeded catalog rows for testing");
      }

      const inventory: InventoryBase = {
        id: 1n,
        name: "Test Inventory",
        organizationData: null,
        methodologyVersionId,
        organization: { summary: { name: "Org Summary Name" } },
      };
      const orgData: OrganizationDataField = {
        name: "OrgData Name (should be ignored)",
        sectorId: sector.id.toString(),
        subsectorId: subsector.id.toString(),
        sizeId: size.id.toString(),
        mainActivityId: mainActivity.id.toString(),
        mainActivityQuantity: 100,
      };

      const attrs = await resolveInventoryAttributes(
        prisma,
        inventory,
        orgData
      );

      expect(attrs.companyName).toBe("Org Summary Name");
      expect(attrs.sectorName).toBe(sector.name);
      expect(attrs.subsectorName).toBe(subsector.name);
      expect(attrs.sizeName).toBe(size.name);
      expect(attrs.mainActivityName).toBe(mainActivity.name);
      expect(attrs.mainActivityQuantity).toBe(100);
    });

    it("falls back to organizationData.name for companyName when there is no organization", async () => {
      const inventory: InventoryBase = {
        id: 1n,
        name: "Test Inventory",
        organizationData: null,
        methodologyVersionId,
        organization: null,
      };
      const orgData: OrganizationDataField = {
        name: "OrgData Only Name",
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: null,
        mainActivityQuantity: null,
      };

      const attrs = await resolveInventoryAttributes(
        prisma,
        inventory,
        orgData
      );

      expect(attrs.companyName).toBe("OrgData Only Name");
      expect(attrs.sectorName).toBeNull();
      expect(attrs.subsectorName).toBeNull();
      expect(attrs.sizeName).toBeNull();
      expect(attrs.mainActivityName).toBeNull();
    });
  });

  describe("calculateEquivalence (unit)", () => {
    it("returns null when mainActivityQuantity is negative", async () => {
      const orgData: OrganizationDataField = {
        name: null,
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: "1",
        mainActivityQuantity: -5,
      };

      const result = await calculateEquivalence(prisma, orgData, 100);
      expect(result).toBeNull();
    });

    it("returns null when mainActivityId is missing even if quantity is positive", async () => {
      const orgData: OrganizationDataField = {
        name: null,
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: null,
        mainActivityQuantity: 10,
      };

      const result = await calculateEquivalence(prisma, orgData, 100);
      expect(result).toBeNull();
    });

    it("computes the rate and resolves the activity name when mainActivityId is valid", async () => {
      const mainActivity = await prisma.organizationMainActivity.findFirst();
      if (!mainActivity) {
        throw new Error("Expected a seeded OrganizationMainActivity row");
      }
      const orgData: OrganizationDataField = {
        name: null,
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: mainActivity.id.toString(),
        mainActivityQuantity: 50,
      };

      const result = await calculateEquivalence(prisma, orgData, 200);
      expect(result).not.toBeNull();
      expect(result!.rate).toBe(4);
      expect(result!.activityName).toBe(mainActivity.name);
    });

    it("falls back to the default activity name when mainActivityId does not resolve to a row", async () => {
      const orgData: OrganizationDataField = {
        name: null,
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: "999999999",
        mainActivityQuantity: 50,
      };

      const result = await calculateEquivalence(prisma, orgData, 100);
      expect(result).not.toBeNull();
      expect(result!.activityName).toBe("actividad principal");
    });
  });

  describe("buildGHGBreakdown (unit)", () => {
    const makeCategory = (
      subcategories: CategoryData["subcategories"]
    ): CategoryData => ({
      id: "1",
      name: "Test Category",
      synonyms: "test",
      position: 1,
      icon: IconNameSchema.parse("FACTORY"),
      color: "#000000",
      subtotal: 0,
      subcategories,
    });

    it("returns zeroed gas totals when no lines are mapped for a subcategory", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0,
          hasIncompleteLines: false,
        },
      ]);

      const [row] = buildGHGBreakdown(category, new Map());

      expect(row).toMatchObject({
        subcategoryName: "Sub A",
        co2Fossil: 0,
        ch4: 0,
        n2o: 0,
        hfc: 0,
        pfc: 0,
        sf6: 0,
        nf3: 0,
      });
    });

    it("skips lines with no factor, emission factor, or gas details", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0,
          hasIncompleteLines: false,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [{ inputType: "SIMPLIFIED", factor: null, result: null }],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.co2Fossil).toBe(0);
    });

    it("accumulates gas details and computes emissions when a result is present", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 1,
          hasIncompleteLines: false,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [
                {
                  inputType: "SIMPLIFIED",
                  factor: {
                    emissionFactor: {
                      gasDetails: {
                        co2Fossil: 5,
                        ch4: 2,
                        n2o: 1,
                        hfc: 0.5,
                        pfc: 0.3,
                        sf6: 0.2,
                        nf3: 0.1,
                      },
                    },
                  },
                  result: { totalEmissions: 1000 },
                },
              ],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.co2Fossil).toBe(5);
      expect(row.ch4).toBe(2);
      expect(row.n2o).toBe(1);
      expect(row.hfc).toBe(0.5);
      expect(row.pfc).toBe(0.3);
      expect(row.sf6).toBe(0.2);
      expect(row.nf3).toBe(0.1);
    });

    it("falls back to co2 when co2Fossil is absent, defaults missing gases to 0, and zeroes emissions with no result", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0,
          hasIncompleteLines: true,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [
                {
                  inputType: "SIMPLIFIED",
                  factor: {
                    emissionFactor: { gasDetails: { co2: 3 } },
                  },
                  result: null,
                },
              ],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.co2Fossil).toBe(3);
      expect(row.ch4).toBe(0);
      expect(row.n2o).toBe(0);
      expect(row.hfc).toBe(0);
      expect(row.pfc).toBe(0);
      expect(row.sf6).toBe(0);
      expect(row.nf3).toBe(0);
    });

    it("adds line emissions to co2Fossil when gasDetails is empty and emissions are present", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0.5,
          hasIncompleteLines: false,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [
                {
                  inputType: "SIMPLIFIED",
                  factor: { emissionFactor: { gasDetails: {} } },
                  result: { totalEmissions: 500 },
                },
              ],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.co2Fossil).toBe(0.5);
    });

    it("does not add to co2Fossil when gasDetails is empty but there are no emissions yet", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0,
          hasIncompleteLines: true,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [
                {
                  inputType: "SIMPLIFIED",
                  factor: { emissionFactor: { gasDetails: {} } },
                  result: null,
                },
              ],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.co2Fossil).toBe(0);
    });

    it("treats non-finite gas detail values as 0", () => {
      const category = makeCategory([
        {
          id: "sub-1",
          name: "Sub A",
          icon: IconNameSchema.parse("FACTORY"),
          subtotal: 0,
          hasIncompleteLines: false,
        },
      ]);
      const linesBySubcategory = new Map([
        [
          "sub-1",
          [
            {
              inputs: [
                {
                  inputType: "SIMPLIFIED",
                  factor: {
                    emissionFactor: { gasDetails: { ch4: "not-a-number" } },
                  },
                  result: null,
                },
              ],
              subcategory: { name: "Sub A" },
            },
          ],
        ],
      ]);

      const [row] = buildGHGBreakdown(category, linesBySubcategory);
      expect(row.ch4).toBe(0);
    });
  });
});
