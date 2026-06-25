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
import type { FastifyInstance } from "fastify";
import { type PrismaClient, CountrySubsectorStatus } from "@repo/database";
import type { GetAllAdminCountrySubsectorsResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSubList ";

describe("GET /api/admin/country-subsectors - Integration Tests", () => {
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

  it("default returns ACTIVE rows only", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("ParentDefault"),
    });
    const active = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Active"),
    });
    const deleted = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Deleted"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-subsectors/",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountrySubsectorsResponse;
    const ids = body.map((r) => r.id);
    expect(ids).toContain(active.id.toString());
    expect(ids).not.toContain(deleted.id.toString());
  });

  it("status=deleted returns DELETED rows only", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("ParentDeleted"),
    });
    const active = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("ActiveX"),
    });
    const deleted = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("DeletedX"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-subsectors/?status=deleted",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountrySubsectorsResponse;

    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === active.id.toString())).toBeUndefined();
  });

  it("status=all returns both ACTIVE and DELETED rows", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("ParentAll"),
    });
    const active = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("ActiveY"),
    });
    const deleted = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("DeletedY"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-subsectors/?status=all",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountrySubsectorsResponse;

    expect(body.find((r) => r.id === active.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
  });

  it("counts ACTIVE main activities in impactedChildren", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("ParentInUse"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("SubInUse"),
    });
    await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("MA"),
      countrySectorId: parent.id,
      countrySubsectorId: sub.id,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-subsectors/?status=active",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountrySubsectorsResponse;

    const row = body.find((r) => r.id === sub.id.toString());
    expect(row).toBeDefined();
    expect(row!.impactedChildren.activeMainActivities).toBe(1);
  });

  it("returns 400 for an invalid status value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-subsectors/?status=garbage",
    });
    expect(response.statusCode).toBe(400);
  });
});
