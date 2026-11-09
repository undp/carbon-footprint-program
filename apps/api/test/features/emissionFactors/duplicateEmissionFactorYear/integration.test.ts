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
  createEmptyMethodologyVersion,
  getTestMethodologyVersionId,
} from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  SEEDED_CATALOGUE_YEAR,
} from "@test/factories/emissionFactorFactory.js";
import {
  carbonInventoryPatterns,
  createCarbonInventory,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
} from "@test/factories/carbonInventorySeeder.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  EMISSION_FACTOR_YEAR_COPY_MAX_CHANGES,
  EMISSION_FACTOR_YEAR_MAX,
  type DuplicateEmissionFactorYearChange,
  type DuplicateEmissionFactorYearResponse,
  type EmissionFactorYearCopyInvalidDetails,
  type GetAllEmissionFactorsResponse,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  Prisma,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
  InventoryStatus,
  MethodologyVersionStatus,
  SubcategoryStatus,
  SystemRole,
  type EmissionFactor,
  type PrismaClient,
  type User,
} from "@repo/database";

const URL = "/api/emission-factors/duplicate-year";
const NAME_PREFIX = "Test - Year Copy";
const SOURCE_YEAR = 2026;
const TARGET_YEAR = 2027;

const GAS_DETAILS = {
  CO2_FOSSIL: 0,
  CH4: 0,
  N2O: 0,
  HFC: 0,
  PFC: 0,
  SF6: 0,
  NF3: 0,
};

interface ErrorBody {
  code: string;
  details?: EmissionFactorYearCopyInvalidDetails;
}

describe("POST /api/emission-factors/duplicate-year - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let user: User;
  let rateUnitIds: [bigint, bigint, bigint];

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    user = await getTestLoggedUser(prisma);
    const units = await prisma.rateMeasurementUnit.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: 3,
    });
    if (units.length < 3) {
      throw new Error("The testing seed must have three rate units");
    }
    rateUnitIds = [units[0].id, units[1].id, units[2].id];
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(cleanup);

  async function cleanup() {
    await prisma.carbonInventory.deleteMany({
      where: { methodologyVersion: { name: { startsWith: NAME_PREFIX } } },
    });
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: NAME_PREFIX } },
    });
  }

  /**
   * A methodology version shaped like the base seed's: «Combustiones
   * estacionarias» with the fuel as its required dimension, and «Electricidad»
   * with both dimensions.
   */
  async function createCatalogue(
    status: MethodologyVersionStatus = MethodologyVersionStatus.UNPUBLISHED
  ) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: NAME_PREFIX,
      status,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: `${NAME_PREFIX} Category`,
      position: 1,
    });
    const stationary = await createTestSubcategory(prisma, category.id, {
      name: `${NAME_PREFIX} Combustiones estacionarias`,
    });
    const fuel = await createTestEmissionFactorDimension(
      prisma,
      stationary.id,
      {
        position: 1,
        isRequired: true,
      }
    );
    const biodiesel = await createTestEmissionFactorDimensionValue(
      prisma,
      fuel.id,
      { value: "Biodiésel" }
    );
    const electricity = await createTestSubcategory(prisma, category.id, {
      name: `${NAME_PREFIX} Electricidad`,
    });
    const grid = await createTestEmissionFactorDimension(
      prisma,
      electricity.id,
      { position: 1, isRequired: true }
    );
    const period = await createTestEmissionFactorDimension(
      prisma,
      electricity.id,
      { position: 2, isRequired: true }
    );
    const nationalGrid = await createTestEmissionFactorDimensionValue(
      prisma,
      grid.id,
      { value: "Sistema nacional" }
    );
    const yearly = await createTestEmissionFactorDimensionValue(
      prisma,
      period.id,
      { value: "Anual" }
    );

    const biodieselFactor = (
      rateUnit: bigint,
      overrides?: Parameters<typeof createTestEmissionFactor>[3]
    ) =>
      createTestEmissionFactor(prisma, stationary.id, rateUnit, {
        dimensionValue1Id: biodiesel.id,
        source: "DEFRA 2026",
        year: SOURCE_YEAR,
        value: "2.5",
        ...overrides,
      });
    const electricityFactor = (
      overrides?: Parameters<typeof createTestEmissionFactor>[3]
    ) =>
      createTestEmissionFactor(prisma, electricity.id, rateUnitIds[0], {
        dimensionValue1Id: nationalGrid.id,
        dimensionValue2Id: yearly.id,
        source: "DEFRA 2026",
        year: SOURCE_YEAR,
        value: "0.177",
        ...overrides,
      });

    return {
      methodology,
      stationary,
      electricity,
      biodiesel,
      nationalGrid,
      yearly,
      biodieselFactor,
      electricityFactor,
    };
  }

  type Catalogue = Awaited<ReturnType<typeof createCatalogue>>;
  /** Only the version is needed to post a copy or read a year. */
  type VersionRef = { methodology: { id: bigint } };

  function post(
    catalogue: VersionRef,
    changes: DuplicateEmissionFactorYearChange[] = [],
    overrides?: Record<string, unknown>
  ) {
    return app.inject({
      method: "POST",
      url: URL,
      payload: {
        methodologyVersionId: catalogue.methodology.id.toString(),
        sourceYear: SOURCE_YEAR,
        targetYear: TARGET_YEAR,
        changes,
        ...overrides,
      },
    });
  }

  const findYear = (catalogue: VersionRef, year: number) =>
    prisma.emissionFactor.findMany({
      where: {
        year,
        status: EmissionFactorStatus.ACTIVE,
        subcategory: {
          category: { methodologyVersionId: catalogue.methodology.id },
        },
      },
      orderBy: { id: "asc" },
    });

  const violationsOf = (body: string) =>
    (JSON.parse(body) as ErrorBody).details?.violations ?? [];

  async function injectAs(role: SystemRole, run: () => Promise<unknown>) {
    const originalRole = user.role;
    await prisma.user.update({ where: { id: user.id }, data: { role } });
    try {
      return await run();
    } finally {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: originalRole },
      });
    }
  }

  describe("authorization", () => {
    it("lets an ADMIN copy a year without changes", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);
      await catalogue.electricityFactor();

      const response = (await injectAs(SystemRole.ADMIN, () =>
        post(catalogue)
      )) as Awaited<ReturnType<typeof post>>;

      expect(response.statusCode).toBe(200);
      expect(response.json<DuplicateEmissionFactorYearResponse>()).toEqual({
        copiedCount: 2,
        editedCount: 0,
        excludedCount: 0,
        skipped: { existingCount: 0 },
      });
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(2);
    });

    it("refuses a USER with 403 and creates nothing", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = (await injectAs(SystemRole.USER, () =>
        post(catalogue)
      )) as Awaited<ReturnType<typeof post>>;

      expect(response.statusCode).toBe(403);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });
  });

  describe("validation", () => {
    it("refuses equal years with 400", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue, [], { targetYear: SOURCE_YEAR });

      expect(response.statusCode).toBe(400);
    });

    it("refuses a year out of bounds with 400", async () => {
      const catalogue = await createCatalogue();

      const response = await post(catalogue, [], {
        targetYear: EMISSION_FACTOR_YEAR_MAX + 1,
      });

      expect(response.statusCode).toBe(400);
    });

    it("refuses a blank source with 400 and creates nothing", async () => {
      const catalogue = await createCatalogue();
      const factor = await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue, [
        { sourceFactorId: factor.id.toString(), source: "   " },
      ]);

      expect(response.statusCode).toBe(400);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });

    it("refuses more changes than the limit with 400", async () => {
      const catalogue = await createCatalogue();

      const response = await post(
        catalogue,
        Array.from(
          { length: EMISSION_FACTOR_YEAR_COPY_MAX_CHANGES + 1 },
          (_, i) => ({ sourceFactorId: String(i + 1) })
        )
      );

      expect(response.statusCode).toBe(400);
    });

    it("answers 404 for an unknown methodology version", async () => {
      const response = await post({ methodology: { id: 999999999n } });

      expect(response.statusCode).toBe(404);
      expect((JSON.parse(response.body) as ErrorBody).code).toBe(
        "METHODOLOGY_NOT_FOUND"
      );
    });

    it("answers 404 for a deleted methodology version", async () => {
      const catalogue = await createCatalogue(MethodologyVersionStatus.DELETED);
      await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue);

      expect(response.statusCode).toBe(404);
      expect((JSON.parse(response.body) as ErrorBody).code).toBe(
        "METHODOLOGY_NOT_FOUND"
      );
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });

    it("copies into a published methodology version", async () => {
      const catalogue = await createCatalogue(
        MethodologyVersionStatus.PUBLISHED
      );
      await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(1);
    });
  });

  describe("copied factors", () => {
    it("copies every field into a new row of the target year", async () => {
      const catalogue = await createCatalogue();
      const source = await catalogue.electricityFactor({
        value: "0.1234567891",
        gasDetails: { ...GAS_DETAILS, CO2_FOSSIL: 0.1, CH4: 0.0234567891 },
      });

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      const [copy] = await findYear(catalogue, TARGET_YEAR);
      expect(copy).toBeDefined();
      expect(copy.id).not.toBe(source.id);
      expect(copy).toMatchObject({
        subcategoryId: source.subcategoryId,
        dimensionValue1Id: source.dimensionValue1Id,
        dimensionValue2Id: source.dimensionValue2Id,
        rateMeasurementUnitId: source.rateMeasurementUnitId,
        source: source.source,
        gasDetails: source.gasDetails,
        year: TARGET_YEAR,
        status: EmissionFactorStatus.ACTIVE,
        createdById: user.id,
        updatedAt: null,
      });
      expect(copy.value.toString()).toBe("0.1234567891");
    });

    it("applies a change of value and source, and leaves the source year as it was", async () => {
      const catalogue = await createCatalogue();
      const electricity = await catalogue.electricityFactor();
      const biodiesel = await catalogue.biodieselFactor(rateUnitIds[0]);
      const before = await findYear(catalogue, SOURCE_YEAR);

      const response = await post(catalogue, [
        {
          sourceFactorId: electricity.id.toString(),
          value: 0.207,
          source: "Red nacional 2027",
        },
      ]);

      expect(response.statusCode).toBe(200);
      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 2, editedCount: 1 });
      const copies = await findYear(catalogue, TARGET_YEAR);
      const electricityCopy = copies.find(
        (factor) => factor.subcategoryId === electricity.subcategoryId
      );
      const biodieselCopy = copies.find(
        (factor) => factor.subcategoryId === biodiesel.subcategoryId
      );
      expect(electricityCopy?.value.toString()).toBe("0.207");
      expect(electricityCopy?.source).toBe("Red nacional 2027");
      expect(biodieselCopy?.value.toString()).toBe("2.5");
      expect(await findYear(catalogue, SOURCE_YEAR)).toEqual(before);
    });

    it("leaves other methodology versions and other years untouched", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);
      await catalogue.biodieselFactor(rateUnitIds[1], { year: 2025 });
      const other = await createCatalogue();
      await other.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      expect(await findYear(other, TARGET_YEAR)).toHaveLength(0);
      expect(await findYear(catalogue, 2025)).toHaveLength(1);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(1);
    });

    it("accepts a negative value", async () => {
      const catalogue = await createCatalogue();
      const factor = await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue, [
        { sourceFactorId: factor.id.toString(), value: -0.5 },
      ]);

      expect(response.statusCode).toBe(200);
      const [copy] = await findYear(catalogue, TARGET_YEAR);
      expect(copy?.value.toString()).toBe("-0.5");
    });

    it("lets a copied factor be edited and deleted", async () => {
      const catalogue = await createCatalogue();
      const source = await catalogue.biodieselFactor(rateUnitIds[0]);
      await post(catalogue);
      const [copy] = await findYear(catalogue, TARGET_YEAR);

      const update = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${copy.id.toString()}`,
        payload: { value: 3 },
      });
      expect(update.statusCode).toBe(200);
      const sourceAfter = await prisma.emissionFactor.findUniqueOrThrow({
        where: { id: source.id },
      });
      expect(sourceAfter.value.toString()).toBe("2.5");

      const remove = await app.inject({
        method: "DELETE",
        url: `/api/emission-factors/${copy.id.toString()}`,
      });
      expect(remove.statusCode).toBe(200);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });

    it("copies a factor locked by a live footprint line, and its copy can be edited", async () => {
      const catalogue = await createCatalogue();
      const source = await catalogue.biodieselFactor(rateUnitIds[0]);
      await lockByUse(catalogue, source);

      const lockedEdit = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${source.id.toString()}`,
        payload: { value: 3 },
      });
      expect(lockedEdit.statusCode).toBe(409);

      const response = await post(catalogue);
      expect(response.statusCode).toBe(200);
      const [copy] = await findYear(catalogue, TARGET_YEAR);
      const copyEdit = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${copy.id.toString()}`,
        payload: { value: 3 },
      });
      expect(copyEdit.statusCode).toBe(200);
    });
  });

  describe("sources", () => {
    it("copies a second source in a subcategory, stored normalized", async () => {
      const catalogue = await createCatalogue();
      const kgGj = await catalogue.biodieselFactor(rateUnitIds[0]);
      await catalogue.biodieselFactor(rateUnitIds[1]);

      const response = await post(catalogue, [
        { sourceFactorId: kgGj.id.toString(), source: "  DEFRA   2027 " },
      ]);

      expect(response.statusCode).toBe(200);
      const sources = (await findYear(catalogue, TARGET_YEAR)).map(
        (factor) => factor.source
      );
      expect(sources.sort()).toEqual(["DEFRA 2026", "DEFRA 2027"]);
    });

    it("copies the alternatives of one row, each with its source", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0], { source: "DEFRA 2026" });
      await catalogue.biodieselFactor(rateUnitIds[0], { source: "IPCC 2006" });

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      const sources = (await findYear(catalogue, TARGET_YEAR)).map(
        (factor) => factor.source
      );
      expect(sources.sort()).toEqual(["DEFRA 2026", "IPCC 2006"]);
    });

    it("refuses two alternatives that end with one source, reporting both", async () => {
      const catalogue = await createCatalogue();
      const defra = await catalogue.biodieselFactor(rateUnitIds[0], {
        source: "DEFRA 2026",
      });
      const ipcc = await catalogue.biodieselFactor(rateUnitIds[0], {
        source: "IPCC 2006",
      });

      const response = await post(catalogue, [
        { sourceFactorId: ipcc.id.toString(), source: "defra 2026" },
      ]);

      expect(response.statusCode).toBe(422);
      expect((JSON.parse(response.body) as ErrorBody).code).toBe(
        "EMISSION_FACTOR_YEAR_COPY_INVALID"
      );
      expect(violationsOf(response.body)).toEqual(
        expect.arrayContaining([
          {
            sourceFactorId: defra.id.toString(),
            reason: "DUPLICATE_TARGET_FACTOR",
          },
          {
            sourceFactorId: ipcc.id.toString(),
            reason: "DUPLICATE_TARGET_FACTOR",
          },
        ])
      );
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });
  });

  describe("exclusion", () => {
    it("leaves excluded factors out and counts them", async () => {
      const catalogue = await createCatalogue();
      const factors = await Promise.all(
        rateUnitIds.map((unit) => catalogue.biodieselFactor(unit))
      );
      await catalogue.electricityFactor();

      const response = await post(
        catalogue,
        factors.map((factor) => ({
          sourceFactorId: factor.id.toString(),
          exclude: true as const,
        }))
      );

      expect(response.statusCode).toBe(200);
      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 1, excludedCount: 3 });
      const copies = await findYear(catalogue, TARGET_YEAR);
      expect(
        copies.filter(
          (factor) => factor.subcategoryId === catalogue.stationary.id
        )
      ).toHaveLength(0);
    });

    it("ignores the other fields of an excluded change", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0], { source: "DEFRA 2026" });
      const ipcc = await catalogue.biodieselFactor(rateUnitIds[0], {
        source: "IPCC 2006",
      });

      const response = await post(catalogue, [
        {
          sourceFactorId: ipcc.id.toString(),
          exclude: true,
          source: "DEFRA 2026",
        },
      ]);

      expect(response.statusCode).toBe(200);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(1);
    });
  });

  describe("existing target factors", () => {
    it("keeps an existing target factor and ignores the change to it", async () => {
      const catalogue = await createCatalogue();
      const source = await catalogue.electricityFactor();
      const existing = await catalogue.electricityFactor({
        year: TARGET_YEAR,
        value: "0.3",
      });

      const response = await post(catalogue, [
        { sourceFactorId: source.id.toString(), value: 0.207 },
      ]);

      expect(response.statusCode).toBe(200);
      expect(response.json<DuplicateEmissionFactorYearResponse>()).toEqual({
        copiedCount: 0,
        editedCount: 0,
        excludedCount: 0,
        skipped: { existingCount: 1 },
      });
      const targets = await findYear(catalogue, TARGET_YEAR);
      expect(targets).toHaveLength(1);
      expect(targets[0].id).toBe(existing.id);
      expect(targets[0].value.toString()).toBe("0.3");
    });

    it("copies the three rate units into an empty year", async () => {
      const catalogue = await createCatalogue();
      await Promise.all(
        rateUnitIds.map((unit) => catalogue.biodieselFactor(unit))
      );

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(3);
    });

    it("completes a partially loaded target year", async () => {
      const catalogue = await createCatalogue();
      await Promise.all(
        rateUnitIds.map((unit) => catalogue.biodieselFactor(unit))
      );
      await catalogue.biodieselFactor(rateUnitIds[0], { year: TARGET_YEAR });

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 2, skipped: { existingCount: 1 } });
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(3);
    });

    it("skips a row the target holds with another source", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0], { source: "DEFRA 2026" });
      await catalogue.biodieselFactor(rateUnitIds[0], {
        year: TARGET_YEAR,
        source: "Inventario nacional 2027",
      });

      const response = await post(catalogue);

      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 0, skipped: { existingCount: 1 } });
    });

    it("skips a both-dimension factor the target holds in another unit", async () => {
      const catalogue = await createCatalogue();
      await catalogue.electricityFactor();
      await createTestEmissionFactor(
        prisma,
        catalogue.electricity.id,
        rateUnitIds[1],
        {
          dimensionValue1Id: catalogue.nationalGrid.id,
          dimensionValue2Id: catalogue.yearly.id,
          source: "DEFRA 2026",
          year: TARGET_YEAR,
        }
      );

      const response = await post(catalogue);

      expect(response.statusCode).toBe(200);
      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 0, skipped: { existingCount: 1 } });
    });

    it("creates nothing the second time the same copy is posted", async () => {
      const catalogue = await createCatalogue();
      await Promise.all(
        rateUnitIds.map((unit) => catalogue.biodieselFactor(unit))
      );

      const first = await post(catalogue);
      const second = await post(catalogue);

      const firstBody = first.json<DuplicateEmissionFactorYearResponse>();
      expect(second.json<DuplicateEmissionFactorYearResponse>()).toMatchObject({
        copiedCount: 0,
        skipped: { existingCount: firstBody.copiedCount },
      });
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(3);
    });

    it("answers 200 with nothing copied for an empty source year", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue, [], { sourceYear: 2024 });

      expect(response.statusCode).toBe(200);
      expect(
        response.json<DuplicateEmissionFactorYearResponse>()
      ).toMatchObject({ copiedCount: 0 });
    });
  });

  describe("violations", () => {
    it("refuses a value that no longer matches its gas breakdown", async () => {
      const catalogue = await createCatalogue();
      const factor = await catalogue.biodieselFactor(rateUnitIds[0], {
        gasDetails: { ...GAS_DETAILS, CO2_FOSSIL: 2.5 },
      });

      const response = await post(catalogue, [
        { sourceFactorId: factor.id.toString(), value: 3 },
      ]);

      expect(response.statusCode).toBe(422);
      expect(violationsOf(response.body)).toEqual([
        {
          sourceFactorId: factor.id.toString(),
          reason: "GAS_DETAILS_MISMATCH",
        },
      ]);
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });

    it("accepts a new value with a matching new gas breakdown", async () => {
      const catalogue = await createCatalogue();
      const factor = await catalogue.biodieselFactor(rateUnitIds[0], {
        gasDetails: { ...GAS_DETAILS, CO2_FOSSIL: 2.5 },
      });

      const response = await post(catalogue, [
        {
          sourceFactorId: factor.id.toString(),
          value: 3,
          gasDetails: { ...GAS_DETAILS, CO2_FOSSIL: 3 },
        },
      ]);

      expect(response.statusCode).toBe(200);
      const [copy] = await findYear(catalogue, TARGET_YEAR);
      expect(copy?.gasDetails).toMatchObject({ CO2_FOSSIL: 3 });
    });

    it("refuses a change for a factor outside the source year or the version", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);
      const otherYear = await catalogue.biodieselFactor(rateUnitIds[1], {
        year: 2025,
      });
      const other = await createCatalogue();
      const otherVersion = await other.biodieselFactor(rateUnitIds[0]);

      const response = await post(catalogue, [
        { sourceFactorId: otherYear.id.toString() },
        { sourceFactorId: otherVersion.id.toString() },
      ]);

      expect(response.statusCode).toBe(422);
      expect(violationsOf(response.body)).toEqual([
        {
          sourceFactorId: otherYear.id.toString(),
          reason: "UNKNOWN_SOURCE_FACTOR",
        },
        {
          sourceFactorId: otherVersion.id.toString(),
          reason: "UNKNOWN_SOURCE_FACTOR",
        },
      ]);
    });

    it("reports several violations together and creates nothing", async () => {
      const catalogue = await createCatalogue();
      const repeated = await catalogue.biodieselFactor(rateUnitIds[0]);
      const broken = await catalogue.biodieselFactor(rateUnitIds[1], {
        gasDetails: { ...GAS_DETAILS, CO2_FOSSIL: 2.5 },
      });
      await catalogue.biodieselFactor(rateUnitIds[2]);

      const response = await post(catalogue, [
        { sourceFactorId: repeated.id.toString(), value: 1 },
        { sourceFactorId: repeated.id.toString(), value: 2 },
        { sourceFactorId: broken.id.toString(), value: 9 },
      ]);

      expect(response.statusCode).toBe(422);
      expect(violationsOf(response.body)).toEqual(
        expect.arrayContaining([
          {
            sourceFactorId: repeated.id.toString(),
            reason: "DUPLICATE_CHANGE",
          },
          {
            sourceFactorId: broken.id.toString(),
            reason: "GAS_DETAILS_MISMATCH",
          },
        ])
      );
      expect(await findYear(catalogue, TARGET_YEAR)).toHaveLength(0);
    });
  });

  describe("unusable source factors", () => {
    it("does not copy the factors of a deleted subcategory", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);
      await catalogue.electricityFactor();
      // What deleting a subcategory does: its factors go with it.
      await prisma.subcategory.update({
        where: { id: catalogue.stationary.id },
        data: { status: SubcategoryStatus.DELETED },
      });
      await prisma.emissionFactor.updateMany({
        where: { subcategoryId: catalogue.stationary.id },
        data: { status: EmissionFactorStatus.DELETED },
      });

      const response = await post(catalogue);

      expect(response.json<DuplicateEmissionFactorYearResponse>()).toEqual({
        copiedCount: 1,
        editedCount: 0,
        excludedCount: 0,
        skipped: { existingCount: 0 },
      });
    });

    it("does not copy an ACTIVE factor that points to a deleted dimension value", async () => {
      const catalogue = await createCatalogue();
      await catalogue.biodieselFactor(rateUnitIds[0]);
      await catalogue.electricityFactor();
      // Written outside the maintainer, which refuses to remove a value in use.
      await prisma.emissionFactorDimensionValue.update({
        where: { id: catalogue.biodiesel.id },
        data: { status: EmissionFactorDimensionValueStatus.DELETED },
      });

      const response = await post(catalogue);

      expect(response.json<DuplicateEmissionFactorYearResponse>()).toEqual({
        copiedCount: 1,
        editedCount: 0,
        excludedCount: 0,
        skipped: { existingCount: 0 },
      });
    });
  });

  describe("full catalogue", () => {
    const EMPTY_YEAR = 2099;

    afterAll(async () => {
      await prisma.emissionFactor.deleteMany({ where: { year: EMPTY_YEAR } });
    });

    it("copies the whole testing catalogue's year in one call", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const listing = await app.inject({
        method: "GET",
        url: `/api/emission-factors?methodologyVersionId=${methodologyVersionId.toString()}`,
      });
      const visible = listing
        .json<GetAllEmissionFactorsResponse>()
        .filter((factor) => factor.year === SEEDED_CATALOGUE_YEAR);
      expect(visible.length).toBeGreaterThan(0);

      const response = await post(
        { methodology: { id: methodologyVersionId } },
        [],
        { sourceYear: SEEDED_CATALOGUE_YEAR, targetYear: EMPTY_YEAR }
      );

      expect(response.statusCode).toBe(200);
      expect(response.json<DuplicateEmissionFactorYearResponse>()).toEqual({
        copiedCount: visible.length,
        editedCount: 0,
        excludedCount: 0,
        skipped: { existingCount: 0 },
      });
    });
  });

  /** Points a live line of a claimed footprint at the factor. */
  async function lockByUse(catalogue: Catalogue, factor: EmissionFactor) {
    const inventory = await createCarbonInventory(prisma, {
      ...carbonInventoryPatterns.simplifiedDraft(),
      methodologyVersionId: catalogue.methodology.id,
      year: SOURCE_YEAR,
      status: InventoryStatus.ACTIVE,
    });
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      catalogue.stationary.id
    );
    const input = await createCarbonInventoryLineInput(prisma, line.id, {
      quantity: new Prisma.Decimal(10),
      isActive: true,
    });
    await createCarbonInventoryLineFactor(prisma, input.id, {
      appliedFactorValue: factor.value,
      appliedFactorRateUnitId: factor.rateMeasurementUnitId,
      emissionFactorId: factor.id,
      appliedFactorSource: factor.source,
    });
  }
});
