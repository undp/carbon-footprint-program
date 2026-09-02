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
  createTestEmissionFactorDimension,
  createTestEmissionFactorDimensionValue,
  getTestRateMeasurementUnitIdByAbbreviation,
} from "@test/factories/emissionFactorFactory.js";
import { createEmissionFactorService } from "@/features/emissionFactors/createEmissionFactor/service.js";
import { updateEmissionFactorService } from "@/features/emissionFactors/updateEmissionFactor/service.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { mapUserToResponse } from "@/features/users/mappers.js";
import type { FastifyInstance } from "fastify";
import { EmissionFactorStatus, type PrismaClient } from "@repo/database";
import type { User } from "@repo/types";

/**
 * The catalog's identity rule, exercised end to end against the real index.
 *
 * The active-factor identity is
 *   (subcategory, required dimension values, year, source,
 *    numerator magnitude, denominator magnitude)
 * and two parts of that are easy to get wrong, so each has its own case here:
 * `year = null` is a real value meaning "transversal" rather than a wildcard, and
 * the key uses the unit *family* rather than the exact unit, so `kg/kg` and
 * `kg/ton` are one factor written two ways while `kg/kWh` and `kg/m3` are not.
 */
describe("Emission factor vintages - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let user: User;

  // Same family (mass/mass), so these two must never coexist for one identity.
  let kgPerKgId: bigint;
  let kgPerTonId: bigint;
  // Different families, so these may.
  let kgPerKwhId: bigint;
  let kgPerM3Id: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    user = mapUserToResponse(await getTestLoggedUser(prisma));

    kgPerKgId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/kg"
    );
    kgPerTonId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/ton"
    );
    kgPerKwhId = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/kWh"
    );
    kgPerM3Id = await getTestRateMeasurementUnitIdByAbbreviation(
      prisma,
      "kg/m3"
    );
  });

  afterAll(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - Vintage" } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - Vintage" } },
    });
  });

  /** A subcategory with no dimensions, so identity is year + source + family. */
  async function buildSubcategory() {
    const methodology = await createEmptyMethodologyVersion(prisma, {
      name: `Test - Vintage ${Date.now()}-${Math.random()}`,
    });
    const category = await createTestCategory(prisma, methodology.id, {
      name: "Test - Vintage Category",
      position: 1,
    });
    return await createTestSubcategory(prisma, category.id, {
      name: "Test - Vintage Subcategory",
    });
  }

  const GAS_DETAILS = {
    CO2_FOSSIL: 0,
    CH4: 0,
    N2O: 0,
    HFC: 0,
    PFC: 0,
    SF6: 0,
    NF3: 0,
  };

  function createRequest(overrides: {
    subcategoryId: bigint;
    rateMeasurementUnitId: bigint;
    source: string;
    year: number | null;
    dimensionValue1Name?: string | null;
  }) {
    return {
      subcategoryId: overrides.subcategoryId.toString(),
      dimensionValue1Name: overrides.dimensionValue1Name ?? null,
      dimensionValue2Name: null,
      rateMeasurementUnitId: overrides.rateMeasurementUnitId.toString(),
      source: overrides.source,
      year: overrides.year,
      gasDetails: GAS_DETAILS,
      value: 1.5,
    };
  }

  describe("A factor declares its reporting year explicitly", () => {
    it("persists and returns a dated factor's provider and year separately", async () => {
      const subcategory = await buildSubcategory();

      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      expect(created.source).toBe("DEFRA");
      expect(created.year).toBe(2025);
    });

    it("persists an explicit null year as a transversal factor", async () => {
      const subcategory = await buildSubcategory();

      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "IPCC",
          year: null,
        }),
        user
      );

      expect(created.year).toBeNull();
    });

    it("accepts a source that contains a year, because guidance must not block a save", async () => {
      const subcategory = await buildSubcategory();

      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA 2025",
          year: 2025,
        }),
        user
      );

      expect(created.source).toBe("DEFRA 2025");
    });

    it("derives the unit family from the rate unit rather than from the request", async () => {
      const subcategory = await buildSubcategory();

      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      const stored = await prisma.emissionFactor.findUniqueOrThrow({
        where: { id: BigInt(created.id) },
        select: {
          numeratorMagnitudeId: true,
          denominatorMagnitudeId: true,
          rateMeasurementUnit: {
            select: {
              numeratorMeasurementUnit: { select: { magnitudeId: true } },
              denominatorMeasurementUnit: { select: { magnitudeId: true } },
            },
          },
        },
      });

      expect(stored.numeratorMagnitudeId).toBe(
        stored.rateMeasurementUnit.numeratorMeasurementUnit.magnitudeId
      );
      expect(stored.denominatorMagnitudeId).toBe(
        stored.rateMeasurementUnit.denominatorMeasurementUnit.magnitudeId
      );
    });
  });

  describe("Year is part of the identity", () => {
    it("accepts a second vintage of the same provider", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      const second = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2026,
        }),
        user
      );

      expect(second.year).toBe(2026);
    });

    it("rejects the same provider and year twice", async () => {
      const subcategory = await buildSubcategory();
      const request = createRequest({
        subcategoryId: subcategory.id,
        rateMeasurementUnitId: kgPerKwhId,
        source: "DEFRA",
        year: 2025,
      });
      await createEmissionFactorService(prisma, request, user);

      await expect(
        createEmissionFactorService(prisma, request, user)
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });

    it("rejects a duplicate transversal factor, so null is not a wildcard", async () => {
      const subcategory = await buildSubcategory();
      const request = createRequest({
        subcategoryId: subcategory.id,
        rateMeasurementUnitId: kgPerKwhId,
        source: "IPCC",
        year: null,
      });
      await createEmissionFactorService(prisma, request, user);

      await expect(
        createEmissionFactorService(prisma, request, user)
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });

    it("treats a transversal factor and a dated one as different identities", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "IPCC",
          year: null,
        }),
        user
      );

      const dated = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "IPCC",
          year: 2025,
        }),
        user
      );

      expect(dated.year).toBe(2025);
    });
  });

  describe("Multiple providers may coexist in the same rank", () => {
    it("accepts two providers for the same year", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      // The removed source-consistency rule would have rejected this.
      const second = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "IPCC",
          year: 2025,
        }),
        user
      );

      expect(second.source).toBe("IPCC");
    });

    it("accepts two transversal providers", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "IPCC",
          year: null,
        }),
        user
      );

      const second = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "Kool, A.",
          year: null,
        }),
        user
      );

      expect(second.source).toBe("Kool, A.");
    });
  });

  describe("Identity uses the unit family, not the exact unit", () => {
    it("rejects the same factor written in a convertible unit of the same family", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKgId,
          source: "IPCC",
          year: null,
        }),
        user
      );

      // kg/kg and kg/ton are both mass/mass: one canonical factor, two ways of
      // writing it. The kg/ton representation comes from conversion instead.
      await expect(
        createEmissionFactorService(
          prisma,
          createRequest({
            subcategoryId: subcategory.id,
            rateMeasurementUnitId: kgPerTonId,
            source: "IPCC",
            year: null,
          }),
          user
        )
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });

    it("lets non-convertible unit families coexist for one provider and year", async () => {
      const subcategory = await buildSubcategory();

      for (const rateMeasurementUnitId of [kgPerKgId, kgPerKwhId, kgPerM3Id]) {
        const created = await createEmissionFactorService(
          prisma,
          createRequest({
            subcategoryId: subcategory.id,
            rateMeasurementUnitId,
            source: "DEFRA",
            year: 2025,
          }),
          user
        );
        expect(created.id).toBeTruthy();
      }

      const stored = await prisma.emissionFactor.count({
        where: {
          subcategoryId: subcategory.id,
          status: EmissionFactorStatus.ACTIVE,
        },
      });
      expect(stored).toBe(3);
    });

    it("re-derives the unit family when an update changes the rate unit", async () => {
      const subcategory = await buildSubcategory();
      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      await updateEmissionFactorService(
        prisma,
        created.id,
        { rateMeasurementUnitId: kgPerM3Id.toString() },
        user
      );

      const stored = await prisma.emissionFactor.findUniqueOrThrow({
        where: { id: BigInt(created.id) },
        select: {
          denominatorMagnitudeId: true,
          rateMeasurementUnit: {
            select: {
              denominatorMeasurementUnit: { select: { magnitudeId: true } },
            },
          },
        },
      });

      // A stale pair would leave the row outside the identity the index enforces.
      expect(stored.denominatorMagnitudeId).toBe(
        stored.rateMeasurementUnit.denominatorMeasurementUnit.magnitudeId
      );
    });

    it("lets an update move a factor onto a free year", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );
      const second = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2024,
        }),
        user
      );

      const updated = await updateEmissionFactorService(
        prisma,
        second.id,
        { year: 2023 },
        user
      );

      expect(updated.year).toBe(2023);
    });

    it("rejects an update that would collide with another vintage", async () => {
      const subcategory = await buildSubcategory();
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );
      const second = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2024,
        }),
        user
      );

      await expect(
        updateEmissionFactorService(prisma, second.id, { year: 2025 }, user)
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });
  });

  describe("Only required dimensions take part in the identity", () => {
    it("ignores a value parked in a non-required dimension slot", async () => {
      const subcategory = await buildSubcategory();
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false, name: "Tipo" }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Caldera",
      });

      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      // The slot is not part of the key, so filling it in must not create a
      // second identity for the same provider, year and family.
      await expect(
        createEmissionFactorService(
          prisma,
          createRequest({
            subcategoryId: subcategory.id,
            rateMeasurementUnitId: kgPerKwhId,
            source: "DEFRA",
            year: 2025,
            dimensionValue1Name: "Caldera",
          }),
          user
        )
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });

    it("ignores a value already stored in a non-required dimension slot", async () => {
      const subcategory = await buildSubcategory();
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: false, name: "Tipo" }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Caldera",
      });

      // The stored factor is the one carrying the optional value this time. The
      // check has to look past it in both directions, or the second factor is
      // accepted and two rows share one identity.
      await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
          dimensionValue1Name: "Caldera",
        }),
        user
      );

      await expect(
        createEmissionFactorService(
          prisma,
          createRequest({
            subcategoryId: subcategory.id,
            rateMeasurementUnitId: kgPerKwhId,
            source: "DEFRA",
            year: 2025,
          }),
          user
        )
      ).rejects.toMatchObject({ code: "EMISSION_FACTOR_DUPLICATE" });
    });

    it("keeps required dimension values as separate identities", async () => {
      const subcategory = await buildSubcategory();
      const dimension = await createTestEmissionFactorDimension(
        prisma,
        subcategory.id,
        { position: 1, isRequired: true, name: "Combustible" }
      );
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Diésel",
      });
      await createTestEmissionFactorDimensionValue(prisma, dimension.id, {
        value: "Gasolina",
      });

      for (const dimensionValue1Name of ["Diésel", "Gasolina"]) {
        const created = await createEmissionFactorService(
          prisma,
          createRequest({
            subcategoryId: subcategory.id,
            rateMeasurementUnitId: kgPerKwhId,
            source: "DEFRA",
            year: 2025,
            dimensionValue1Name,
          }),
          user
        );
        expect(created.dimensionValue1Name).toBe(dimensionValue1Name);
      }
    });
  });

  describe("A retired factor releases its identity", () => {
    it("lets a new factor take a DELETED factor's identity", async () => {
      const subcategory = await buildSubcategory();
      const retired = await createTestEmissionFactor(
        prisma,
        subcategory.id,
        kgPerKwhId,
        { source: "DEFRA", year: 2025, status: EmissionFactorStatus.DELETED }
      );
      expect(retired.status).toBe(EmissionFactorStatus.DELETED);

      // The unique index is partial on `status <> 'DELETED'`, which is what lets
      // the migration retire a duplicate representation by soft delete.
      const created = await createEmissionFactorService(
        prisma,
        createRequest({
          subcategoryId: subcategory.id,
          rateMeasurementUnitId: kgPerKwhId,
          source: "DEFRA",
          year: 2025,
        }),
        user
      );

      expect(created.year).toBe(2025);
    });
  });
});
