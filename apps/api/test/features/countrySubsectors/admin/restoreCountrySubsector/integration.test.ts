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
import { type PrismaClient, CountrySubsectorStatus } from "@repo/database";
import type { RestoreCountrySubsectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSubRes ";

describe("POST /api/admin/country-subsectors/:id/restore - Integration Tests", () => {
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

  it("restores a DELETED subsector when no collision exists", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Restorable"),
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${sub.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as RestoreCountrySubsectorResponse;
    expect(body.status).toBe(CountrySubsectorStatus.ACTIVE);
  });

  it("returns 409 when ACTIVE collision exists in the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const name = uniqueName("Collision");
    await createTestCountrySubsector(prisma, parent.id, { name });
    const deleted = await createTestCountrySubsector(prisma, parent.id, {
      name,
      status: CountrySubsectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the subsector is already ACTIVE", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("AlreadyActive"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-subsectors/${sub.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when the subsector id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-subsectors/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });
});
