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
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  OrganizationMainActivityStatus,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import type { RestoreOrganizationMainActivityResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminMARes ";

describe("POST /api/admin/organization-main-activities/:id/restore - Integration Tests", () => {
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
    // Main activities carry an FK to sector/subsector — clear them first.
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

  it("restores a DELETED main activity", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Restorable"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as RestoreOrganizationMainActivityResponse;
    expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
  });

  it("returns 409 when an ACTIVE collision exists on (name, sectorId, subsectorId)", async () => {
    const name = uniqueName("Collision");
    await createTestOrganizationMainActivity(prisma, { name });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name,
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the main activity is already ACTIVE", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("AlreadyActive"),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Parent catalog validation", () => {
    it("restores a DELETED activity parented to an ACTIVE sector only", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SectorOnly"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RestoreOrganizationMainActivityResponse;
      expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
      expect(body.countrySectorId).toBe(sector.id.toString());
    });

    it("restores a DELETED activity parented to an ACTIVE subsector with no sector persisted", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("SubOnly"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RestoreOrganizationMainActivityResponse;
      expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
      expect(body.countrySubsectorId).toBe(subsector.id.toString());
    });

    it("restores a DELETED activity whose persisted sector/subsector pair is consistent", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const subsector = await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Pair"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sector.id,
        countrySubsectorId: subsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(200);
    });

    it("returns 400 when the persisted subsector belongs to a different sector than the persisted sector (data integrity guard)", async () => {
      const sectorA = await createTestCountrySector(prisma, {
        name: uniqueName("SecA"),
      });
      const sectorB = await createTestCountrySector(prisma, {
        name: uniqueName("SecB"),
      });
      const subB = await createTestCountrySubsector(prisma, sectorB.id, {
        name: uniqueName("SubB"),
      });
      // Bypasses service-level validation by writing directly via the factory —
      // models a legacy/inconsistent row that predates the guard.
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("Mismatch"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: sectorA.id,
        countrySubsectorId: subB.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 409 when the persisted sector is no longer ACTIVE", async () => {
      const deadSector = await createTestCountrySector(prisma, {
        name: uniqueName("DeadSec"),
        status: CountrySectorStatus.DELETED,
      });
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("OnDeadSector"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySectorId: deadSector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("PARENT_NOT_ACTIVE");
    });

    it("returns 409 when the persisted subsector is no longer ACTIVE", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("Sec"),
      });
      const deadSubsector = await createTestCountrySubsector(
        prisma,
        sector.id,
        {
          name: uniqueName("DeadSub"),
          status: CountrySubsectorStatus.DELETED,
        }
      );
      const ma = await createTestOrganizationMainActivity(prisma, {
        name: uniqueName("OnDeadSubsector"),
        status: OrganizationMainActivityStatus.DELETED,
        countrySubsectorId: deadSubsector.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("PARENT_NOT_ACTIVE");
    });
  });

  describe("Concurrent restores racing for the same ACTIVE slot", () => {
    it("lets exactly one of two concurrent restores win when both target the same (name, null, null) slot", async () => {
      // Both rows share (name, sector=null, subsector=null). Firing both restores
      // concurrently races them past the transaction's own pre-check "collision"
      // SELECT, so the DB's partial unique index (not the pre-check) is what
      // ultimately rejects the loser — exercising the service's P2002 catch
      // branch instead of the earlier, already-covered 409 pre-check branch.
      const name = uniqueName("Race");
      const maA = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
      });
      const maB = await createTestOrganizationMainActivity(prisma, {
        name,
        status: OrganizationMainActivityStatus.DELETED,
      });

      const [responseA, responseB] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/admin/organization-main-activities/${maA.id.toString()}/restore`,
        }),
        app.inject({
          method: "POST",
          url: `/api/admin/organization-main-activities/${maB.id.toString()}/restore`,
        }),
      ]);

      const codes = [responseA.statusCode, responseB.statusCode].sort(
        (a, b) => a - b
      );
      expect(codes).toEqual([200, 409]);

      const [reloadedA, reloadedB] = await Promise.all([
        prisma.organizationMainActivity.findUnique({ where: { id: maA.id } }),
        prisma.organizationMainActivity.findUnique({ where: { id: maB.id } }),
      ]);
      const activeCount = [reloadedA, reloadedB].filter(
        (row) => row!.status === OrganizationMainActivityStatus.ACTIVE
      ).length;
      expect(activeCount).toBe(1);
    });
  });
});
