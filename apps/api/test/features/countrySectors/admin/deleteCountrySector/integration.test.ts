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
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountrySectorStatus,
  CountrySubsectorStatus,
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

    it("does NOT block when the sector is referenced only by user data (organizationData)", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("UserDataOnly"),
      });
      const organization = await createTestOrganization(prisma);
      await prisma.organizationData.create({
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
    });
  });

  describe("Blocked by ACTIVE catalog references", () => {
    it("returns 409 when an ACTIVE subsector points at the sector", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithActiveSub"),
      });
      await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("ActiveSub"),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("DELETE_BLOCKED_BY_REFERENCES");

      const reloaded = await prisma.countrySector.findUnique({
        where: { id: sector.id },
      });
      expect(reloaded!.status).toBe(CountrySectorStatus.ACTIVE);
    });

    it("does NOT block when the only subsectors are DELETED", async () => {
      const sector = await createTestCountrySector(prisma, {
        name: uniqueName("WithOnlyDeletedSub"),
      });
      await createTestCountrySubsector(prisma, sector.id, {
        name: uniqueName("DeadSub"),
        status: CountrySubsectorStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/admin/country-sectors/${sector.id.toString()}`,
      });
      expect(response.statusCode).toBe(200);
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
  });
});
