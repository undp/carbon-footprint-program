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
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
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

  it("allows soft-delete when referenced only by DELETED main activities", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("DeadMA"),
      countrySubsectorId: sub.id,
      countrySectorId: parent.id,
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);
  });

  it("does NOT block when only user data (organizationData) references the subsector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("UserData"),
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
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);
  });

  it("returns 409 when an ACTIVE main activity references it", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("WithActiveMA"),
    });
    await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("ActiveMA"),
      countrySubsectorId: sub.id,
      countrySectorId: parent.id,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
    });
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("DELETE_BLOCKED_BY_REFERENCES");

    const reloaded = await prisma.countrySubsector.findUnique({
      where: { id: sub.id },
    });
    expect(reloaded!.status).toBe(CountrySubsectorStatus.ACTIVE);
  });

  it("returns 404 when subsector id does not exist", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/country-subsectors/9999999999",
    });
    expect(response.statusCode).toBe(404);
  });
});
