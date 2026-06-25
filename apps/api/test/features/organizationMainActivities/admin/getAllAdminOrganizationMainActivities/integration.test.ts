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
import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type { GetAllAdminOrganizationMainActivitiesResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminMAList ";

describe("GET /api/admin/organization-main-activities - Integration Tests", () => {
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
    const active = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Active"),
    });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Deleted"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/organization-main-activities/",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminOrganizationMainActivitiesResponse;
    const ids = body.map((r) => r.id);
    expect(ids).toContain(active.id.toString());
    expect(ids).not.toContain(deleted.id.toString());
  });

  it("status=deleted returns DELETED rows only", async () => {
    const active = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Active2"),
    });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Deleted2"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/organization-main-activities/?status=deleted",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminOrganizationMainActivitiesResponse;
    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === active.id.toString())).toBeUndefined();
  });

  it("status=all returns both", async () => {
    const active = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Active3"),
    });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Deleted3"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/organization-main-activities/?status=all",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminOrganizationMainActivitiesResponse;
    expect(body.find((r) => r.id === active.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
  });

  it("rows include parent sector/subsector names", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("ParentSec"),
    });
    const sub = await createTestCountrySubsector(prisma, sector.id, {
      name: uniqueName("ParentSub"),
    });
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("WithParents"),
      countrySectorId: sector.id,
      countrySubsectorId: sub.id,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/organization-main-activities/?status=active",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminOrganizationMainActivitiesResponse;
    const row = body.find((r) => r.id === ma.id.toString());
    expect(row).toBeDefined();
    expect(row!.countrySectorName).toBe(sector.name);
    expect(row!.countrySubsectorName).toBe(sub.name);
    expect(row!.impactedChildren.organizationData).toBe(0);
  });

  it("returns 400 for an invalid status value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/organization-main-activities/?status=garbage",
    });
    expect(response.statusCode).toBe(400);
  });
});
