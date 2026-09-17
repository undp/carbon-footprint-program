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
import type { GetEmissionFactorYearsResponse } from "@repo/types";
import {
  CategoryStatus,
  EmissionFactorStatus,
  SubcategoryStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  createEmptyMethodologyVersion,
  getTestMethodologyVersionId,
} from "@test/factories/methodologyFactory.js";
import {
  createTestCategory,
  cleanupTestCategories,
} from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
  SEEDED_CATALOGUE_YEAR,
} from "@test/factories/emissionFactorFactory.js";
import {
  createInventoryFromPattern,
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";
import { getEmissionFactorYearsService } from "@/features/carbonInventories/getEmissionFactorYears/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

const CATEGORY_NAMES = {
  extraYear: "Test - Factor Years Extra Year",
  deletedCategory: "Test - Factor Years Deleted Category",
  deletedSubcategory: "Test - Factor Years Deleted Subcategory",
  deletedFactor: "Test - Factor Years Deleted Factor",
  otherMethodology: "Test - Factor Years Other Methodology",
} as const;

/**
 * Dates that exist nowhere in the seed, so a year showing up in a response can
 * only have come from the factor the test just wrote.
 */
const YEARS = {
  extra: 2031,
  deletedCategory: 2032,
  deletedSubcategory: 2033,
  deletedFactor: 2034,
  otherMethodology: 2035,
} as const;

describe("GET /api/carbon-inventories/:id/emission-factor-years - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  const createdMethodologyVersionIds: bigint[] = [];

  /**
   * Hangs a fresh category and subcategory off `methodologyVersionId` and fills
   * them with `factors`, so each test owns every row it asserts about. Factors
   * of the same year need distinct sources: the catalogue's unique index covers
   * (subcategory, dimensions, source, year).
   */
  const seedFactors = async (
    methodologyVersionId: bigint,
    categoryName: string,
    factors: { year: number; source?: string; status?: string }[],
    ownerStatuses?: {
      category?: CategoryStatus;
      subcategory?: SubcategoryStatus;
    }
  ) => {
    const category = await createTestCategory(prisma, methodologyVersionId, {
      name: categoryName,
      ...(ownerStatuses?.category ? { status: ownerStatuses.category } : {}),
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      ...(ownerStatuses?.subcategory
        ? { status: ownerStatuses.subcategory }
        : {}),
    });
    const rateMeasurementUnitId = await getTestRateMeasurementUnitId(prisma);

    for (const factor of factors) {
      await createTestEmissionFactor(
        prisma,
        subcategory.id,
        rateMeasurementUnitId,
        {
          year: factor.year,
          ...(factor.source ? { source: factor.source } : {}),
          ...(factor.status ? { status: factor.status } : {}),
        }
      );
    }
  };

  const seedInventoryOnSeededMethodology = async () => {
    const methodologyVersionId = await getTestMethodologyVersionId(prisma);
    const carbonInventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { methodologyVersionId, year: SEEDED_CATALOGUE_YEAR }
    );

    return { methodologyVersionId, carbonInventory };
  };

  const getYears = async (carbonInventoryId: bigint | string) => {
    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${carbonInventoryId}/emission-factor-years`,
    });

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as GetEmissionFactorYearsResponse;
  };

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
    await cleanupTestCategories(prisma, Object.values(CATEGORY_NAMES));

    if (createdMethodologyVersionIds.length > 0) {
      await prisma.methodologyVersion.deleteMany({
        where: { id: { in: createdMethodologyVersionIds } },
      });
      createdMethodologyVersionIds.length = 0;
    }
  });

  it("returns the year the seeded catalogue covers", async () => {
    const { carbonInventory } = await seedInventoryOnSeededMethodology();

    expect(await getYears(carbonInventory.id)).toEqual([SEEDED_CATALOGUE_YEAR]);
  });

  it("reports a newly covered year once, oldest first", async () => {
    const { methodologyVersionId, carbonInventory } =
      await seedInventoryOnSeededMethodology();

    // Two factors of the same year: the response must still carry it once.
    await seedFactors(methodologyVersionId, CATEGORY_NAMES.extraYear, [
      { year: YEARS.extra, source: "Test Source A" },
      { year: YEARS.extra, source: "Test Source B" },
    ]);

    expect(await getYears(carbonInventory.id)).toEqual([
      SEEDED_CATALOGUE_YEAR,
      YEARS.extra,
    ]);
  });

  it("ignores years carried only by unreachable factors", async () => {
    const { methodologyVersionId, carbonInventory } =
      await seedInventoryOnSeededMethodology();

    // Each of these would reach the capture step only if its owner were active,
    // so the year behind it is not worth offering either.
    await seedFactors(
      methodologyVersionId,
      CATEGORY_NAMES.deletedCategory,
      [{ year: YEARS.deletedCategory }],
      { category: CategoryStatus.DELETED }
    );
    await seedFactors(
      methodologyVersionId,
      CATEGORY_NAMES.deletedSubcategory,
      [{ year: YEARS.deletedSubcategory }],
      { subcategory: SubcategoryStatus.DELETED }
    );
    await seedFactors(methodologyVersionId, CATEGORY_NAMES.deletedFactor, [
      { year: YEARS.deletedFactor, status: EmissionFactorStatus.DELETED },
    ]);

    expect(await getYears(carbonInventory.id)).toEqual([SEEDED_CATALOGUE_YEAR]);
  });

  it("does not leak the years of another methodology", async () => {
    const { carbonInventory } = await seedInventoryOnSeededMethodology();
    const otherMethodology = await createEmptyMethodologyVersion(prisma, {
      name: "Test - Factor Years Other Methodology Version",
    });
    createdMethodologyVersionIds.push(otherMethodology.id);

    await seedFactors(otherMethodology.id, CATEGORY_NAMES.otherMethodology, [
      { year: YEARS.otherMethodology },
    ]);

    // A footprint never changes methodology version, so a year that only
    // another methodology covers would strand the user one step later.
    expect(await getYears(carbonInventory.id)).toEqual([SEEDED_CATALOGUE_YEAR]);
  });

  // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
  // enumeration: the access hook answers before the handler runs.
  it("returns 403 for a non-existent inventory", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/carbon-inventories/999999999/emission-factor-years",
    });

    expect(response.statusCode).toBe(403);
  });

  it("throws a not-found error from the service for a non-existent inventory", async () => {
    await expect(
      getEmissionFactorYearsService(prisma, "999999999")
    ).rejects.toThrow(CarbonInventoryNotFoundError);
  });
});
