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
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
} from "@repo/database";
import type { GetAllAdminCountrySectorsResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSecList ";

describe("GET /api/admin/country-sectors - Integration Tests", () => {
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

  describe("Status filter", () => {
    it("default (no query) returns ACTIVE rows only", async () => {
      const active = await createTestCountrySector(prisma, {
        name: uniqueName("Active"),
      });
      const deleted = await createTestCountrySector(prisma, {
        name: uniqueName("Deleted"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      const ids = body.map((row) => row.id);
      expect(ids).toContain(active.id.toString());
      expect(ids).not.toContain(deleted.id.toString());
    });

    it("status=active returns ACTIVE rows only", async () => {
      const active = await createTestCountrySector(prisma, {
        name: uniqueName("Active2"),
      });
      const deleted = await createTestCountrySector(prisma, {
        name: uniqueName("Deleted2"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=active",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      expect(body.find((r) => r.id === active.id.toString())).toBeDefined();
      expect(body.find((r) => r.id === deleted.id.toString())).toBeUndefined();
    });

    it("status=deleted returns DELETED rows only", async () => {
      const active = await createTestCountrySector(prisma, {
        name: uniqueName("Active3"),
      });
      const deleted = await createTestCountrySector(prisma, {
        name: uniqueName("Deleted3"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=deleted",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
      expect(body.find((r) => r.id === active.id.toString())).toBeUndefined();
    });

    it("status=all returns both ACTIVE and DELETED rows", async () => {
      const active = await createTestCountrySector(prisma, {
        name: uniqueName("Active4"),
      });
      const deleted = await createTestCountrySector(prisma, {
        name: uniqueName("Deleted4"),
        status: CountrySectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=all",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      expect(body.find((r) => r.id === active.id.toString())).toBeDefined();
      expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
    });

    it("returns 400 for an invalid status value", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=garbage",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("impactedChildren counts", () => {
    it("counts ACTIVE catalog children", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("InUseFlag"),
      });
      await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("Sub"),
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=active",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      const row = body.find((r) => r.id === sector.id.toString());
      expect(row).toBeDefined();
      expect(row!.impactedChildren.activeSubsectors).toBe(1);
    });

    it("does not count DELETED catalog children", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("OnlyDeletedChild"),
      });
      await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("DeletedSub"),
        status: CountrySubsectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/country-sectors/?status=active",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetAllAdminCountrySectorsResponse;

      const row = body.find((r) => r.id === sector.id.toString());
      expect(row).toBeDefined();
      expect(row!.impactedChildren.activeSubsectors).toBe(0);
    });
  });
});
