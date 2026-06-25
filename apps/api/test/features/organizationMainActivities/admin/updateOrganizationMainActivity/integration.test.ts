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
import type { UpdateOrganizationMainActivityResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminMAUpd ";

describe("PATCH /api/admin/organization-main-activities/:id - Integration Tests", () => {
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
    // Orgs (and their organization_data) hold an FK to the main activity, so they
    // must be cleared before the activity rows below.
    await cleanupTestOrganization(prisma);
    // Carbon inventories carry the activity only inside their organizationData
    // JSON snapshot (no FK), so they never block the deletes below — but they
    // must still be removed by name to avoid leaking across tests.
    await prisma.carbonInventory.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
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

  it("partial update of name", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateOrganizationMainActivityResponse;
    expect(body.name).toBe(newName);
  });

  it("returns 400 with empty body", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when reparenting to a missing sector", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("MA"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { countrySectorId: "9999999999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when reparenting to a DELETED sector", async () => {
    const dead = await createTestCountrySector(prisma, {
      name: uniqueName("DeadSec"),
      status: CountrySectorStatus.DELETED,
    });
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("MA"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
      payload: { countrySectorId: dead.id.toString() },
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Sector/subsector pairing invariant", () => {
    it("rejects (a) PATCH where (sectorId, subsectorId) explicit pair mismatches", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: {
          countrySectorId: sectorA.id.toString(),
          countrySubsectorId: subB.id.toString(),
        },
      });
      expect(response.statusCode).toBe(400);

      // Confirm not persisted.
      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBeNull();
      expect(after!.countrySubsectorId).toBeNull();
    });

    it("rejects (b) PATCH that changes only countrySectorId while persisted subsector is under a different sector", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA2"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB2"),
      });
      const subA = await createTestCountrySubsector(prisma, sectorA.id, {
        name: uniqueName("SubA"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
        countrySectorId: sectorA.id,
        countrySubsectorId: subA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(400);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("rejects (c) PATCH that changes only countrySubsectorId to a subsector under a different persisted sector", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA3"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB3"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB3"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("MA"),
        countrySectorId: sectorA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySubsectorId: subB.id.toString() },
      });
      expect(response.statusCode).toBe(400);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySubsectorId).toBeNull();
    });
  });

  describe("Re-parent blocked by dependents", () => {
    it("re-parents to another sector when the activity has no dependents", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Clean"),
        countrySectorId: sectorA.id,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorB.id);
    });

    it("blocks re-parent (409) when an organization profile references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithOrg"),
        countrySectorId: sectorA.id,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { organizationData?: number } };
      };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.organizationData).toBe(1);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("blocks re-parent (409) when an ACTIVE carbon inventory snapshot references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithInv"),
        countrySectorId: sectorA.id,
      });
      // The activity is referenced ONLY inside the inventory's frozen JSON
      // snapshot (stored as a string) — no live organization_data row points at
      // it — so this case is exactly the gap the FK-based count misses.
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        details?: { referencedBy?: { carbonInventories?: number } };
      };
      expect(body.code).toBe("REPARENT_BLOCKED_BY_REFERENCES");
      expect(body.details?.referencedBy?.carbonInventories).toBe(1);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });

    it("does NOT block re-parent when only a DELETED carbon inventory snapshot references the activity", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("WithDeletedInv"),
        countrySectorId: sectorA.id,
      });
      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.withOrganizationData({
          mainActivityId: ma.id.toString(),
        }),
        name: uniqueName("Inv"),
        status: "DELETED",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorB.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorB.id);
    });

    it("does NOT block when the effective pair equals the current one, even with dependents (no-op)", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SameParent"),
        countrySectorId: sectorA.id,
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
        data: {
          organizationId: organization.id,
          legalName: "Test Org",
          mainActivityId: ma.id,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}`,
        payload: { countrySectorId: sectorA.id.toString() },
      });
      expect(response.statusCode).toBe(200);

      const after = await prisma.organizationMainActivity.findUnique({
        where: { id: ma.id },
      });
      expect(after!.countrySectorId).toBe(sectorA.id);
    });
  });
});
