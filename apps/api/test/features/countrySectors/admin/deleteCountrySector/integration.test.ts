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
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  SubcategoryRecommendationStatus,
} from "@repo/database";

const TEST_PREFIX = "Test - AdminSecDel ";

describe("DELETE /api/admin/country-sectors/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestOrganization(prisma);
    // Recommendations reference sectors/subsectors with a non-cascading FK, so
    // they must be removed before the catalog rows they point at.
    await prisma.subcategoryRecommendation.deleteMany({
      where: { sector: { name: { startsWith: TEST_PREFIX } } },
    });
    await prisma.organizationMainActivity.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySubsector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  async function getSeededSubcategoryId(): Promise<bigint> {
    const subcategory = await prisma.subcategory.findFirst({
      select: { id: true },
    });
    if (!subcategory) {
      throw new Error(
        "No seeded subcategory found. Ensure the test database is seeded."
      );
    }
    return subcategory.id;
  }

  describe("Successful soft-delete", () => {
    it("soft-deletes a clean sector and persists status=DELETED", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Clean"),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySector.findUnique({
        where: { id: sector.id },
      });
      expect(reloaded!.status).toBe(CountrySectorStatus.DELETED);
    });

    it("does NOT touch user data (organizationData) — the reference is preserved", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("UserDataOnly"),
      });
      const organization = await createTestOrganization(prisma);
      const orgData = await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          sectorId: sector.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);

      const reloadedOrgData = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });
      expect(reloadedOrgData!.sectorId).toBe(sector.id);
    });
  });

  describe("Cascade soft-delete of ACTIVE catalog children", () => {
    it("cascade soft-deletes ACTIVE subsectors, main activities and subcategory recommendations", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithChildren"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("ActiveSub"),
      });
      const mainActivity = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: sector.id,
        countrySubsectorId: subsector.id,
      });
      const recommendation = await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: await getSeededSubcategoryId(),
          sectorId: sector.id,
          subsectorId: subsector.id,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);

      const [dbSector, dbSubsector, dbMainActivity, dbRecommendation] =
        await Promise.all([
          prisma.countrySector.findUnique({ where: { id: sector.id } }),
          prisma.countrySubsector.findUnique({ where: { id: subsector.id } }),
          prisma.organizationMainActivity.findUnique({
            where: { id: mainActivity.id },
          }),
          prisma.subcategoryRecommendation.findUnique({
            where: { id: recommendation.id },
          }),
        ]);
      expect(dbSector!.status).toBe(CountrySectorStatus.DELETED);
      expect(dbSubsector!.status).toBe(CountrySubsectorStatus.DELETED);
      expect(dbMainActivity!.status).toBe(
        OrganizationMainActivityStatus.DELETED
      );
      expect(dbRecommendation!.status).toBe(
        SubcategoryRecommendationStatus.DELETED
      );
    });

    it("does NOT touch the children of a different sector", async () => {
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const other = await createTestCountrySector(prisma, {
        name: uniqueName("Other"),
      });
      const otherSubsector = await createTestCountrySubsector(
        prisma,
        other.id,
        { name: uniqueName("OtherSub") }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${target.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: otherSubsector.id },
      });
      expect(reloaded!.status).toBe(CountrySubsectorStatus.ACTIVE);
    });

    it("leaves already-DELETED children unchanged", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithDeletedSub"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("DeadSub"),
        status: CountrySubsectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: subsector.id },
      });
      expect(reloaded!.status).toBe(CountrySubsectorStatus.DELETED);
    });
  });

  describe("Not found", () => {
    it("returns 404 when the sector id does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/admin/country-sectors/9999999999",
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when the sector is already DELETED", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("AlreadyDeleted"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
