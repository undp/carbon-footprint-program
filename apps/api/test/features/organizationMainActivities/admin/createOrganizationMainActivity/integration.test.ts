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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestCountrySector } from "@test/factories/countrySectorFactory.js";
import { createTestCountrySubsector } from "@test/factories/countrySubsectorFactory.js";
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  CountrySectorStatus,
  CountrySubsectorStatus,
  OrganizationMainActivityStatus,
  SystemRole,
} from "@repo/database";
import type { CreateOrganizationMainActivityResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminMACreate ";

describe("POST /api/admin/organization-main-activities - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
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

  it("creates an unparented main activity", async () => {
    const name = uniqueName("Loose");
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: { name },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(
      response.body
    ) as CreateOrganizationMainActivityResponse;
    expect(body.name).toBe(name);
    expect(body.countrySectorId).toBeNull();
    expect(body.countrySubsectorId).toBeNull();
    expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
  });

  it("creates a main activity with valid sector + subsector", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("Sec"),
    });
    const sub = await createTestCountrySubsector(prisma, sector.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name: uniqueName("Activity"),
        countrySectorId: sector.id.toString(),
        countrySubsectorId: sub.id.toString(),
      },
    });
    expect(response.statusCode).toBe(201);
  });

  it("returns 400 when name is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when name is whitespace-only", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: { name: "   " },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 with Spanish message when subsector does not belong to sector (no row persisted)", async () => {
    const sectorA = await createTestCountrySector(prisma, {
      name: uniqueName("SecA"),
    });
    const sectorB = await createTestCountrySector(prisma, {
      name: uniqueName("SecB"),
    });
    const subB = await createTestCountrySubsector(prisma, sectorB.id, {
      name: uniqueName("SubB"),
    });

    const candidateName = uniqueName("Mismatch");
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name: candidateName,
        countrySectorId: sectorA.id.toString(),
        countrySubsectorId: subB.id.toString(),
      },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as {
      code: string;
      message: string;
    };
    expect(body.message).toContain("subrubro");

    // Confirm no row persisted.
    const persisted = await prisma.organizationMainActivity.findFirst({
      where: { name: candidateName },
    });
    expect(persisted).toBeNull();
  });

  it("returns 404 when sector parent is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name: uniqueName("OrphanSec"),
        countrySectorId: "9999999999",
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when sector parent is DELETED", async () => {
    const dead = await createTestCountrySector(prisma, {
      name: uniqueName("DeadSec"),
      status: CountrySectorStatus.DELETED,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name: uniqueName("OnDead"),
        countrySectorId: dead.id.toString(),
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when subsector parent is DELETED", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("Sec"),
    });
    const deadSub = await createTestCountrySubsector(prisma, sector.id, {
      name: uniqueName("DeadSub"),
      status: CountrySubsectorStatus.DELETED,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name: uniqueName("OnDeadSub"),
        countrySubsectorId: deadSub.id.toString(),
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 409 when an ACTIVE main activity with the same (name, sector, subsector) exists", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("Sec"),
    });
    const sub = await createTestCountrySubsector(prisma, sector.id, {
      name: uniqueName("Sub"),
    });
    const name = uniqueName("Dup");
    await createTestOrganizationMainActivity(prisma, {
      name,
      countrySectorId: sector.id,
      countrySubsectorId: sub.id,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/",
      payload: {
        name,
        countrySectorId: sector.id.toString(),
        countrySubsectorId: sub.id.toString(),
      },
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 403 when the caller has USER role", async () => {
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organization-main-activities/",
        payload: { name: uniqueName("Forbidden") },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });
});
