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
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, CountrySectorStatus } from "@repo/database";
import type { UpdateCountrySubsectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSubUpd ";

describe("PATCH /api/admin/country-subsectors/:id - Integration Tests", () => {
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
    // Carbon inventories carry the subsector only inside their `organizationData`
    // JSON snapshot (no FK), so they never block the catalog deletes below — but
    // they must still be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
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

  it("partial update of name", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
    expect(body.name).toBe(newName);
  });

  it("returns 400 when body is empty", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 409 when renaming into an existing ACTIVE name within the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const taken = uniqueName("Taken");
    await createTestCountrySubsector(prisma, parent.id, { name: taken });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Mine"),
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: taken },
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 404 when reparenting to a missing sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: "9999999999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when reparenting to a DELETED sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const ghostParent = await createTestCountrySector(prisma, {
      name: uniqueName("Ghost"),
      status: CountrySectorStatus.DELETED,
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: ghostParent.id.toString() },
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Re-parent blocked by dependents", () => {
    it("re-parents to another sector when the subsector has no dependents", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Clean"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(target.id);
    });

    it("blocks re-parent (409) when an ACTIVE main activity references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithMA"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });

    it("blocks re-parent (409) when an ACTIVE subcategory recommendation references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithRec"),
      });
      await prisma.subcategoryRecommendation.create({
        data: {
          subcategoryId: await getSeededSubcategoryId(),
          sectorId: parent.id,
          subsectorId: sub.id,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");
    });

    it("blocks re-parent (409) when an organization profile references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithOrg"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          subsectorId: sub.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");
    });

    it("blocks re-parent (409) when an ACTIVE carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithInv"),
      });
      // The subsector is referenced ONLY inside the inventory's frozen JSON
      // snapshot (stored as a string) — no live organization_data row points at
      // it — so this case is exactly the gap the FK-based counts miss.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { carbonInventories?: number } };
      };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });

    it("does NOT block re-parent when only a DELETED carbon inventory snapshot references the subsector", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const target = await createTestCountrySector(prisma, {
        name: uniqueName("Target"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("WithDeletedInv"),
      });
      // A DELETED inventory's frozen pair is inert and must not block re-parenting.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          subsectorId: sub.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: target.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(target.id);
    });

    it("allows editing only the name even when the subsector has dependents", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("Named"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const newName = uniqueName("Renamed");
      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { name: newName },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
      expect(body.name).toBe(newName);
    });

    it("does NOT block when countrySectorId equals the current parent, even with dependents (no-op)", async () => {
      const parent = await createTestCountrySector(prisma, {
        name: uniqueName("Parent"),
      });
      const sub = await createTestCountrySubsector(prisma, parent.id, {
        name: uniqueName("SameParent"),
      });
      await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("ActiveMA"),
        countrySectorId: parent.id,
        countrySubsectorId: sub.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/country-subsectors/${sub.id.toString()}`,
        payload: { countrySectorId: parent.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const reloaded = await prisma.countrySubsector.findUnique({
        where: { id: sub.id },
      });
      expect(reloaded!.countrySectorId).toBe(parent.id);
    });
  });
});
