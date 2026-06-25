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
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  SubcategoryRecommendationStatus,
} from "@repo/database";

const TEST_PREFIX = "Test - AdminSubDel ";

describe("DELETE /api/admin/country-subsectors/:id - Integration Tests", () => {
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

  it("soft-deletes a clean subsector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Clean"),
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);

    const reloaded = await prisma.countrySubsector.findUnique({
      where: { id: sub.id },
    });
    expect(reloaded!.status).toBe(CountrySubsectorStatus.DELETED);
  });

  it("cascade soft-deletes ACTIVE main activities and subcategory recommendations", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("WithChildren"),
    });
    const mainActivity = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("ActiveMA"),
      countrySubsectorId: sub.id,
      countrySectorId: parent.id,
    });
    const recommendation = await prisma.subcategoryRecommendation.create({
      data: {
        subcategoryId: await getSeededSubcategoryId(),
        sectorId: parent.id,
        subsectorId: sub.id,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);

    const [dbSubsector, dbMainActivity, dbRecommendation, dbParent] =
      await Promise.all([
        prisma.countrySubsector.findUnique({ where: { id: sub.id } }),
        prisma.organizationMainActivity.findUnique({
          where: { id: mainActivity.id },
        }),
        prisma.subcategoryRecommendation.findUnique({
          where: { id: recommendation.id },
        }),
        prisma.countrySector.findUnique({ where: { id: parent.id } }),
      ]);
    expect(dbSubsector!.status).toBe(CountrySubsectorStatus.DELETED);
    expect(dbMainActivity!.status).toBe(OrganizationMainActivityStatus.DELETED);
    expect(dbRecommendation!.status).toBe(
      SubcategoryRecommendationStatus.DELETED
    );
    // The parent sector is never touched by a subsector delete.
    expect(dbParent!.status).toBe(CountrySectorStatus.ACTIVE);
  });

  it("does NOT touch sibling subsectors of the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const target = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Target"),
    });
    const sibling = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sibling"),
    });
    const siblingActivity = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("SiblingMA"),
      countrySubsectorId: sibling.id,
      countrySectorId: parent.id,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${target.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);

    const [dbSibling, dbSiblingActivity] = await Promise.all([
      prisma.countrySubsector.findUnique({ where: { id: sibling.id } }),
      prisma.organizationMainActivity.findUnique({
        where: { id: siblingActivity.id },
      }),
    ]);
    expect(dbSibling!.status).toBe(CountrySubsectorStatus.ACTIVE);
    expect(dbSiblingActivity!.status).toBe(
      OrganizationMainActivityStatus.ACTIVE
    );
  });

  it("does NOT touch user data (organizationData) — the reference is preserved", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("UserData"),
    });
    const organization = await createTestOrganization(prisma);
    const orgData = await prisma.organizationData.create({
      data: {
        organizationId: organization.id,
        legalName: "Test Org",
        subsectorId: sub.id,
        updatedAt: null,
      },
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);

    const reloadedOrgData = await prisma.organizationData.findUnique({
      where: { id: orgData.id },
    });
    expect(reloadedOrgData!.subsectorId).toBe(sub.id);
  });

  it("returns 404 when subsector id does not exist", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/country-subsectors/9999999999",
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when the subsector is already DELETED", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("AlreadyDeleted"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(404);
  });
});
