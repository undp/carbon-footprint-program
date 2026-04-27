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
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  CountrySectorStatus,
  CountrySubsectorStatus,
  SystemRole,
} from "@repo/database";
import type { CreateCountrySubsectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSubCreate ";
const SECTOR_PREFIX = "Test - AdminSubCreateParent ";

describe("POST /api/admin/country-subsectors - Integration Tests", () => {
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
    await prisma.countrySubsector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: SECTOR_PREFIX } },
    });
  });

  function uniqueName(prefix: string, suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${prefix}${suffix} ${random}`;
  }

  it("creates a subsector under an ACTIVE parent and returns 201", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "Parent"),
    });
    const name = uniqueName(TEST_PREFIX, "Sub");

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: { name, countrySectorId: parent.id.toString() },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body) as CreateCountrySubsectorResponse;
    expect(body.name).toBe(name);
    expect(body.status).toBe(CountrySubsectorStatus.ACTIVE);
    expect(body.countrySectorId).toBe(parent.id.toString());
  });

  it("returns 400 when name is missing", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "P"),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: { countrySectorId: parent.id.toString() },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when name is whitespace-only", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "P"),
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: { name: "   ", countrySectorId: parent.id.toString() },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 409 when an ACTIVE subsector with the same name exists in the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "P"),
    });
    const name = uniqueName(TEST_PREFIX, "Dup");
    await createTestCountrySubsector(prisma, parent.id, { name });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: { name, countrySectorId: parent.id.toString() },
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 404 when parent sector does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: {
        name: uniqueName(TEST_PREFIX, "Orphan"),
        countrySectorId: "9999999999",
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when parent sector is DELETED", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "Dead"),
      status: CountrySectorStatus.DELETED,
    });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/",
      payload: {
        name: uniqueName(TEST_PREFIX, "OnDead"),
        countrySectorId: parent.id.toString(),
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 403 when the caller has USER role", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName(SECTOR_PREFIX, "P"),
    });
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-subsectors/",
        payload: {
          name: uniqueName(TEST_PREFIX, "Forbidden"),
          countrySectorId: parent.id.toString(),
        },
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
