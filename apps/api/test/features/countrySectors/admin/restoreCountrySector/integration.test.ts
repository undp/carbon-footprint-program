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
import type { FastifyInstance } from "fastify";
import { type PrismaClient, CountrySectorStatus } from "@repo/database";
import type { RestoreCountrySectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSecRes ";

describe("POST /api/admin/country-sectors/:id/restore - Integration Tests", () => {
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
    await prisma.countrySector.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("restores a DELETED sector when no ACTIVE collision exists", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("Restorable"),
      status: CountrySectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-sectors/${sector.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as RestoreCountrySectorResponse;
    expect(body.status).toBe(CountrySectorStatus.ACTIVE);
  });

  it("returns 409 when an ACTIVE sector with the same name already exists", async () => {
    const name = uniqueName("Collision");
    await createTestCountrySector(prisma, { name });
    const deleted = await createTestCountrySector(prisma, {
      name,
      status: CountrySectorStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-sectors/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the sector is already ACTIVE", async () => {
    const sector = await createTestCountrySector(prisma, {
      name: uniqueName("AlreadyActive"),
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-sectors/${sector.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when the sector id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-sectors/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });
});
