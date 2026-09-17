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
  buildExpectedOrganizationData,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
  createCarbonInventoryLineResult,
  getSubcategoryIds,
  seedCarbonInventory,
} from "@test/factories/carbonInventorySeeder.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  CarbonInventoryLineStatus,
  InventoryStatus,
  type UpdateCarbonInventoryResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import { Prisma, type PrismaClient } from "@repo/database";
import {
  VALIDATION_ERROR_CODE,
  type ApiErrorResponse,
} from "@/commonSchemas/errors.js";
import { createTestMembership } from "../../../factories/membershipFactory.js";
import { getTestLoggedUser } from "../../../factories/userFactory.js";

describe("PATCH /api/carbon-inventories/:id - Integration Tests", () => {
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

  describe("Successful updates", () => {
    it("should update a single field (year)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.id).toBe(inventory.id.toString());
      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("SIMPLIFIED"); // Unchanged

      // Verify in database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.year).toBe(2024);
    });

    it("should update usageMode", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          usageMode: "EXPERT",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.usageMode).toBe("EXPERT");
      expect(body.year).toBeNull(); // Unchanged
    });

    it("should soft-delete an inventory by updating status to DELETED", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          status: InventoryStatus.DELETED,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify status change in database
      const carbonInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(carbonInventory).toBeDefined();
      expect(carbonInventory!.status).toBe(InventoryStatus.DELETED);
    });

    it("should update isEditable", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          isEditable: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.isEditable).toBe(false);
    });

    it("should update organizationId", async () => {
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationId: organizationId.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationId).toBe(organizationId.toString());
    });

    it("should update name", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          name: "Updated Inventory Name",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.name).toBe("Updated Inventory Name");

      // Verify in database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.name).toBe("Updated Inventory Name");
    });

    it("should update organizationBranchId", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationBranchId: "456",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationBranchId).toBe("456");
    });

    it("should update organizationData", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const organizationData = {
        name: "Updated Organization",
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 500,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationData,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        organizationData
      );
      expect(body.organizationData).toEqual(expectedOrganizationData);
    });

    it("should default organizationData.name to null when unlinked and the payload's name is null", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationData: {
            name: null,
            sectorId: null,
            subsectorId: null,
            sizeId: null,
            mainActivityId: null,
            mainActivityQuantity: null,
          },
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationData?.name).toBeNull();
      expect(body.organizationData?.sectorId).toBeNull();
      expect(body.organizationData?.subsectorId).toBeNull();
      expect(body.organizationData?.sizeId).toBeNull();
      expect(body.organizationData?.mainActivityId).toBeNull();
      expect(body.organizationData?.sector).toBeNull();
      expect(body.organizationData?.subsector).toBeNull();
      expect(body.organizationData?.size).toBeNull();
      expect(body.organizationData?.mainActivity).toBeNull();
    });

    it("should update preselectedNodesId", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          preselectedNodesId: "111",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.preselectedNodesId).toBe("111");
    });

    it("should update multiple fields at once", async () => {
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          usageMode: "EXPERT",
          organizationId: organizationId.toString(),
          organizationBranchId: "456",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.year).toBe(2024);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.organizationId).toBe(organizationId.toString());
      expect(body.organizationBranchId).toBe("456");
    });

    it("should set nullable fields to null", async () => {
      const user = await getTestLoggedUser(prisma);

      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        organizationId,
        organizationBranchId: 456,
      });

      await createTestMembership(prisma, user.id, organizationId);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: null,
          organizationId: null,
          organizationBranchId: null,
          organizationData: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
    });

    it("should return complete data including all nullable fields when populated", async () => {
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const organizationData = {
        name: null,
        sectorId: "10",
        subsectorId: "20",
        sizeId: "5",
        mainActivityId: "15",
        mainActivityQuantity: 1000,
      };

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          name: "Full Inventory",
          organizationId: organizationId.toString(),
          organizationBranchId: "789",
          organizationData,
          usageMode: "EXPERT",
          isEditable: false,
          preselectedNodesId: "999",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        organizationData
      );
      expect(body.year).toBe(2024);
      expect(body.name).toBe("Full Inventory");
      expect(body.organizationId).toBe(organizationId.toString());
      expect(body.organizationBranchId).toBe("789");
      expect(body.organizationData).toEqual(expectedOrganizationData);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.isEditable).toBe(false);
      expect(body.preselectedNodesId).toBe("999");
    });
  });

  describe("Year change clears the catalogue factors", () => {
    /**
     * A 2025 footprint holding, on one subcategory:
     *  - a catalogue-backed line with a snapshot and a result;
     *  - a manual-factor line (custom source, no `emissionFactorId`);
     *  - a parked (`OUTDATED`) catalogue-backed line, the shape
     *    `toggleManualTotalEmissions` leaves behind;
     *  - a line edited since it was captured, which still references its
     *    factor and so must be treated as catalogue-backed.
     */
    async function buildFootprintWithFrozenFactors() {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
        year: 2025,
        methodologyVersionId,
      });
      const subcategoryIds = await getSubcategoryIds(
        prisma,
        methodologyVersionId
      );
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);
      const factor = await createTestEmissionFactor(
        prisma,
        subcategoryIds[0],
        rateUnitId,
        { source: "DEFRA 2025", year: 2025, value: "2.5" }
      );

      const seedLine = async (options: {
        status?: CarbonInventoryLineStatus;
        emissionFactorId: bigint | null;
        appliedFactorSource: string;
        manual?: boolean;
      }) => {
        const line = await createCarbonInventoryLine(
          prisma,
          carbonInventory.id,
          subcategoryIds[0],
          { status: options.status ?? CarbonInventoryLineStatus.ACTIVE }
        );
        const input = await createCarbonInventoryLineInput(prisma, line.id, {
          quantity: new Prisma.Decimal(10),
          manualFactor: options.manual ? new Prisma.Decimal(4) : undefined,
          isActive: true,
        });
        await createCarbonInventoryLineFactor(prisma, input.id, {
          appliedFactorValue: new Prisma.Decimal(options.manual ? 4 : 2.5),
          appliedFactorRateUnitId: rateUnitId,
          emissionFactorId: options.emissionFactorId,
          appliedFactorSource: options.appliedFactorSource,
        });
        await createCarbonInventoryLineResult(prisma, input.id, 25);
        return { line, input };
      };

      const catalogue = await seedLine({
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      const manual = await seedLine({
        emissionFactorId: null,
        appliedFactorSource: "Otro",
        manual: true,
      });
      const parked = await seedLine({
        status: CarbonInventoryLineStatus.OUTDATED,
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      const edited = await seedLine({
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      // A snapshot that lost its factor id but kept a catalogue source: a
      // catalogue factor with a broken link, not a manual one.
      const damaged = await seedLine({
        emissionFactorId: null,
        appliedFactorSource: "DEFRA 2025",
      });

      return {
        carbonInventory,
        subcategoryId: subcategoryIds[0],
        factor,
        catalogue,
        manual,
        parked,
        edited,
        damaged,
      };
    }

    const readInput = async (lineId: bigint) =>
      prisma.carbonInventoryLineInput.findFirstOrThrow({
        where: { lineId, isActive: true },
        include: { factor: true, result: true },
      });

    it("clears every catalogue factor and its result, keeping the rest of the line", async () => {
      const { carbonInventory, catalogue, manual, parked, edited } =
        await buildFootprintWithFrozenFactors();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
        payload: { year: 2026 },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2026);

      const clearedInput = await readInput(catalogue.line.id);
      expect(clearedInput.factor).toBeNull();
      expect(clearedInput.result).toBeNull();
      // Everything else the line held is intact, and no replacement factor was
      // chosen for it.
      expect(clearedInput.quantity?.toString()).toBe("10");
      const clearedLine = await prisma.carbonInventoryLine.findUniqueOrThrow({
        where: { id: catalogue.line.id },
        select: { status: true, subcategoryId: true },
      });
      expect(clearedLine.status).toBe(CarbonInventoryLineStatus.ACTIVE);

      // A parked line is cleared too: it can be reactivated without passing
      // through line synchronization, which would carry a stale factor back
      // into an active footprint.
      const parkedInput = await readInput(parked.line.id);
      expect(parkedInput.factor).toBeNull();
      expect(parkedInput.result).toBeNull();

      // A line edited since capture keeps its factor id, so it is cleared like
      // any other catalogue-backed line rather than mistaken for a manual one.
      const editedInput = await readInput(edited.line.id);
      expect(editedInput.factor).toBeNull();
      expect(editedInput.result).toBeNull();

      // The manual factor survives untouched, value and source included.
      const manualInput = await readInput(manual.line.id);
      expect(manualInput.factor?.appliedFactorSource).toBe("Otro");
      expect(manualInput.factor?.appliedFactorValue.toString()).toBe("4");
      expect(manualInput.manualFactor?.toString()).toBe("4");
      expect(manualInput.result).not.toBeNull();
    });

    it("clears a snapshot that lost its factor id but kept a catalogue source", async () => {
      const { carbonInventory, damaged, manual } =
        await buildFootprintWithFrozenFactors();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
        payload: { year: 2026 },
      });
      expect(response.statusCode).toBe(200);

      // Recognising a manual factor by its null id alone would leave this one
      // attached, and the footprint would keep a total computed from the
      // previous year's factor -- the state the clearing exists to prevent.
      const damagedInput = await readInput(damaged.line.id);
      expect(damagedInput.factor).toBeNull();
      expect(damagedInput.result).toBeNull();

      // Told apart from an actual manual factor, which keeps its snapshot.
      const manualInput = await readInput(manual.line.id);
      expect(manualInput.factor?.appliedFactorSource).toBe("Otro");
      expect(manualInput.result).not.toBeNull();
    });

    it("clears the snapshots a duplicated footprint inherited when its year changes", async () => {
      const { carbonInventory } = await buildFootprintWithFrozenFactors();

      const duplicated = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${carbonInventory.id}/duplicate`,
      });
      expect(duplicated.statusCode).toBe(200);
      const copyId = BigInt((JSON.parse(duplicated.body) as { id: string }).id);

      const snapshotsOf = (id: bigint) =>
        prisma.carbonInventoryLineFactor.findMany({
          where: {
            lineInput: { isActive: true, line: { carbonInventoryId: id } },
          },
          select: { emissionFactorId: true, appliedFactorSource: true },
        });

      // The copy inherits every snapshot verbatim — four of the five lines,
      // since duplication copies ACTIVE lines only and one of them is parked.
      expect(await snapshotsOf(copyId)).toHaveLength(4);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${copyId.toString()}`,
        payload: { year: 2026 },
      });
      expect(response.statusCode).toBe(200);

      // Only the manual one is left, and the original footprint is untouched.
      const remaining = await snapshotsOf(copyId);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].emissionFactorId).toBeNull();
      expect(remaining[0].appliedFactorSource).toBe("Otro");

      const remainingResults = await prisma.carbonInventoryLineResult.count({
        where: {
          lineInput: { isActive: true, line: { carbonInventoryId: copyId } },
        },
      });
      expect(remainingResults).toBe(1);

      expect(await snapshotsOf(carbonInventory.id)).toHaveLength(5);
    });

    it("leaves the frozen factors alone when the year does not change", async () => {
      const { carbonInventory, catalogue } =
        await buildFootprintWithFrozenFactors();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
        payload: { year: 2025, name: "Same year, new name" },
      });

      expect(response.statusCode).toBe(200);

      const input = await readInput(catalogue.line.id);
      expect(input.factor).not.toBeNull();
      expect(input.result).not.toBeNull();
    });

    it("keeps the superseded input versions as they are", async () => {
      const { carbonInventory, catalogue, factor } =
        await buildFootprintWithFrozenFactors();
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      // Turn the line's snapshot into history: deactivate it and give the line
      // a fresh active input with its own snapshot, the shape a save leaves.
      await prisma.carbonInventoryLineInput.update({
        where: { id: catalogue.input.id },
        data: { isActive: false },
      });
      const activeInput = await createCarbonInventoryLineInput(
        prisma,
        catalogue.line.id,
        { quantity: new Prisma.Decimal(10), isActive: true }
      );
      await createCarbonInventoryLineFactor(prisma, activeInput.id, {
        appliedFactorValue: new Prisma.Decimal(2.5),
        appliedFactorRateUnitId: rateUnitId,
        emissionFactorId: factor.id,
        appliedFactorSource: "DEFRA 2025",
      });
      await createCarbonInventoryLineResult(prisma, activeInput.id, 25);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
        payload: { year: 2026 },
      });
      expect(response.statusCode).toBe(200);

      // The active input lost its snapshot and its result...
      expect(
        await prisma.carbonInventoryLineFactor.findUnique({
          where: { lineInputId: activeInput.id },
        })
      ).toBeNull();
      expect(
        await prisma.carbonInventoryLineResult.findUnique({
          where: { lineInputId: activeInput.id },
        })
      ).toBeNull();

      // ...while the superseded version keeps both: every reader filters
      // `isActive: true`, so they are audit trail nothing consults.
      const supersededFactor =
        await prisma.carbonInventoryLineFactor.findUnique({
          where: { lineInputId: catalogue.input.id },
        });
      expect(supersededFactor).not.toBeNull();
      const supersededResult =
        await prisma.carbonInventoryLineResult.findUnique({
          where: { lineInputId: catalogue.input.id },
        });
      expect(supersededResult).not.toBeNull();
    });
  });

  describe("Authorization errors", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/999999",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 400 (validation error) for non-numeric id", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/carbon-inventories/invalid",
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(400); // Validation error
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when year is not an integer", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024.5,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when usageMode is invalid", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          usageMode: "INVALID",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when status is invalid", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          status: "INVALID_STATUS",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationId: "invalid",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationBranchId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationBranchId: "not-a-number",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when methodologyVersionId is provided (field is not allowed)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const methodologyVersionIdString = methodologyVersionId.toString();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          methodologyVersionId: methodologyVersionIdString,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when preselectedNodesId is not numeric string", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          preselectedNodesId: "xyz",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationData has invalid structure", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          organizationData: {
            name: "Test",
            sectorId: "invalid", // non-numeric string should fail numeric-id validation
            subsectorId: "10",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when extra fields are provided", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
          extraField: "should not be here",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when payload is empty", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Year boundary tests", () => {
    it("should accept year 2000 (minimum boundary)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2000);
    });

    it("should accept year 2100 (maximum boundary)", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2100,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;
      expect(body.year).toBe(2100);
    });
  });

  describe("Timestamps", () => {
    it("should update the updatedAt timestamp", async () => {
      const inventory = await seedCarbonInventory(prisma, {
        usageMode: "SIMPLIFIED",
      });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const response = await app.inject({
        method: "PATCH",
        url: `/api/carbon-inventories/${inventory.id}`,
        payload: {
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCarbonInventoryResponse;

      expect(body.updatedAt).toBeTruthy();
      const updatedAt = new Date(body.updatedAt!);
      expect(updatedAt.getTime()).toBeGreaterThan(
        new Date(body.createdAt).getTime()
      );

      // createdAt should remain the same
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.createdAt.toISOString()).toBe(
        inventory.createdAt.toISOString()
      );
    });
  });
});
