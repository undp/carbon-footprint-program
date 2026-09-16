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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import { createTestCategory } from "@test/factories/categoryFactory.js";
import { createTestSubcategory } from "@test/factories/subcategoryFactory.js";
import {
  createTestEmissionFactor,
  getTestRateMeasurementUnitId,
} from "@test/factories/emissionFactorFactory.js";
import {
  carbonInventoryPatterns,
  createCarbonInventory,
  createCarbonInventoryLine,
  createCarbonInventoryLineFactor,
  createCarbonInventoryLineInput,
} from "@test/factories/carbonInventorySeeder.js";
import type { GetAllEmissionFactorsResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  Prisma,
  CarbonInventoryLineStatus,
  EmissionFactorStatus,
  MethodologyVersionStatus,
  type EmissionFactor,
  type PrismaClient,
} from "@repo/database";

/**
 * The guard is keyed on the dependency, not on the methodology version's
 * status: a factor is immutable while an active line input references it, and
 * that is the same rule on a published version and on an unpublished one.
 */
describe("Emission factor usage guard - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  const NAME_PREFIX = "Test - Usage Guard";

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
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

  /** A factor of its own methodology version, with nothing pointing at it. */
  async function createUnusedFactor(
    label: string,
    status: MethodologyVersionStatus = MethodologyVersionStatus.UNPUBLISHED
  ) {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `${NAME_PREFIX} ${label}`,
      status,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: `${NAME_PREFIX} ${label} Category`,
      position: 1,
    });
    const subcategory = await createTestSubcategory(prisma, category.id, {
      name: `${NAME_PREFIX} ${label} Subcategory`,
    });
    const rateUnitId = await getTestRateMeasurementUnitId(prisma);
    const factor = await createTestEmissionFactor(
      prisma,
      subcategory.id,
      rateUnitId,
      { source: `${label} Source`, value: "1.5" }
    );

    return { methodology, subcategory, rateUnitId, factor };
  }

  /** Points a line at the factor. The input's `isActive` is what counts. */
  async function referenceFactor(
    context: Awaited<ReturnType<typeof createUnusedFactor>>,
    options?: {
      inputIsActive?: boolean;
      lineStatus?: CarbonInventoryLineStatus;
    }
  ) {
    const inventory = await createCarbonInventory(prisma, {
      ...carbonInventoryPatterns.simplifiedDraft(),
      methodologyVersionId: context.methodology.id,
      year: 2025,
    });
    const line = await createCarbonInventoryLine(
      prisma,
      inventory.id,
      context.subcategory.id,
      { status: options?.lineStatus ?? CarbonInventoryLineStatus.ACTIVE }
    );
    const input = await createCarbonInventoryLineInput(prisma, line.id, {
      quantity: new Prisma.Decimal(10),
      isActive: options?.inputIsActive ?? true,
    });
    await createCarbonInventoryLineFactor(prisma, input.id, {
      appliedFactorValue: new Prisma.Decimal("1.5"),
      appliedFactorRateUnitId: context.rateUnitId,
      emissionFactorId: context.factor.id,
      appliedFactorSource: context.factor.source,
    });
  }

  const readFactor = (factor: EmissionFactor) =>
    prisma.emissionFactor.findUniqueOrThrow({ where: { id: factor.id } });

  const expectInUse = (body: string) =>
    expect((JSON.parse(body) as { code: string }).code).toBe(
      "EMISSION_FACTOR_IN_USE"
    );

  describe("update", () => {
    it("allows updating a factor no line references", async () => {
      const { factor } = await createUnusedFactor("Unused");

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${factor.id.toString()}`,
        payload: { value: 2.75 },
      });

      expect(response.statusCode).toBe(200);
      expect((await readFactor(factor)).value.toString()).toBe("2.75");
    });

    it("refuses to update a factor an active line references, and changes nothing", async () => {
      const context = await createUnusedFactor("Referenced");
      await referenceFactor(context);
      const before = await readFactor(context.factor);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${context.factor.id.toString()}`,
        payload: { value: 99 },
      });

      expect(response.statusCode).toBe(409);
      expectInUse(response.body);
      expect(await readFactor(context.factor)).toEqual(before);
    });

    // The maintainer's breakdown modal reaches this same endpoint with only
    // `gasDetails` in the payload, so it is the likeliest field to escape a
    // guard placed per-field instead of at the top of the service.
    it("refuses a gas-breakdown-only update just the same", async () => {
      const context = await createUnusedFactor("Breakdown");
      await referenceFactor(context);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${context.factor.id.toString()}`,
        payload: {
          gasDetails: {
            CO2_FOSSIL: 1.5,
            CH4: 0,
            N2O: 0,
            HFC: 0,
            PFC: 0,
            SF6: 0,
            NF3: 0,
          },
        },
      });

      expect(response.statusCode).toBe(409);
      expectInUse(response.body);
    });

    // Line inputs are versioned and every reader filters `isActive`, so a
    // reference surviving only in a superseded input is audit trail nothing
    // consults. Counting it would freeze the factor for good.
    it("ignores a reference that survives only in a superseded input", async () => {
      const context = await createUnusedFactor("Superseded");
      await referenceFactor(context, { inputIsActive: false });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${context.factor.id.toString()}`,
        payload: { value: 3.25 },
      });

      expect(response.statusCode).toBe(200);
      expect((await readFactor(context.factor)).value.toString()).toBe("3.25");
    });

    // A parked line keeps its snapshot and is reactivated without passing
    // through line synchronization, so its input still counts.
    it("counts a parked line whose input is still active", async () => {
      const context = await createUnusedFactor("Parked");
      await referenceFactor(context, {
        lineStatus: CarbonInventoryLineStatus.OUTDATED,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${context.factor.id.toString()}`,
        payload: { value: 4.5 },
      });

      expect(response.statusCode).toBe(409);
      expectInUse(response.body);
    });

    it("applies the same rule on a published methodology version", async () => {
      const unused = await createUnusedFactor(
        "Published Unused",
        MethodologyVersionStatus.PUBLISHED
      );

      const allowed = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${unused.factor.id.toString()}`,
        payload: { value: 5.5 },
      });
      expect(allowed.statusCode).toBe(200);

      const used = await createUnusedFactor(
        "Published Used",
        MethodologyVersionStatus.PUBLISHED
      );
      await referenceFactor(used);

      const refused = await app.inject({
        method: "PATCH",
        url: `/api/emission-factors/${used.factor.id.toString()}`,
        payload: { value: 5.5 },
      });
      expect(refused.statusCode).toBe(409);
    });
  });

  describe("delete", () => {
    it("refuses to delete a factor an active line references", async () => {
      const context = await createUnusedFactor("Delete Referenced");
      await referenceFactor(context);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factors/${context.factor.id.toString()}`,
      });

      expect(response.statusCode).toBe(409);
      expectInUse(response.body);
      expect((await readFactor(context.factor)).status).toBe(
        EmissionFactorStatus.ACTIVE
      );
    });

    it("deletes a factor no line references", async () => {
      const { factor } = await createUnusedFactor("Delete Unused");

      const response = await app.inject({
        method: "DELETE",
        url: `/api/emission-factors/${factor.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      expect((await readFactor(factor)).status).toBe(
        EmissionFactorStatus.DELETED
      );
    });
  });

  describe("create", () => {
    // Nothing can reference a factor that does not exist, which is what makes
    // loading a year's set into the live catalogue need no exception.
    it("adds a factor to a published methodology version", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: `${NAME_PREFIX} Create Published`,
        status: MethodologyVersionStatus.PUBLISHED,
      });
      const category = await createTestCategory(prisma, methodology.id, {
        name: `${NAME_PREFIX} Create Published Category`,
        position: 1,
      });
      const subcategory = await createTestSubcategory(prisma, category.id, {
        name: `${NAME_PREFIX} Create Published Subcategory`,
      });
      const rateUnitId = await getTestRateMeasurementUnitId(prisma);

      const response = await app.inject({
        method: "POST",
        url: "/api/emission-factors",
        payload: {
          subcategoryId: subcategory.id.toString(),
          dimensionValue1Name: null,
          dimensionValue2Name: null,
          rateMeasurementUnitId: rateUnitId.toString(),
          source: "DEFRA 2026",
          year: 2026,
          value: 2.5,
          gasDetails: {
            CO2_FOSSIL: 0,
            CH4: 0,
            N2O: 0,
            HFC: 0,
            PFC: 0,
            SF6: 0,
            NF3: 0,
          },
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("listing", () => {
    it("reports how many active lines reference each factor", async () => {
      const context = await createUnusedFactor("Listing");
      const unreferenced = await createTestEmissionFactor(
        prisma,
        context.subcategory.id,
        context.rateUnitId,
        { source: "Listing Source", year: 2026 }
      );
      await referenceFactor(context);
      await referenceFactor(context);

      const response = await app.inject({
        method: "GET",
        url: `/api/emission-factors?methodologyVersionId=${context.methodology.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllEmissionFactorsResponse;

      const referencedRow = body.find(
        ({ id }) => id === context.factor.id.toString()
      );
      const unreferencedRow = body.find(
        ({ id }) => id === unreferenced.id.toString()
      );

      expect(referencedRow?.referencedLineCount).toBe(2);
      expect(unreferencedRow?.referencedLineCount).toBe(0);
    });
  });
});
