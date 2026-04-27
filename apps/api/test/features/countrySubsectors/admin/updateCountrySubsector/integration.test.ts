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
import { type PrismaClient, CountrySectorStatus } from "@repo/database";
import type { UpdateCountrySubsectorResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSubUpd ";

describe("PATCH /api/admin/country-subsectors/:id - Integration Tests", () => {
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

  it("partial update of name", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateCountrySubsectorResponse;
    expect(body.name).toBe(newName);
  });

  it("returns 400 when body is empty", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 409 when renaming into an existing ACTIVE name within the same sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const taken = uniqueName("Taken");
    await createTestCountrySubsector(prisma, parent.id, { name: taken });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Mine"),
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { name: taken },
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 404 when reparenting to a missing sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: "9999999999" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when reparenting to a DELETED sector", async () => {
    const parent = await createTestCountrySector(prisma, {
      name: uniqueName("Parent"),
    });
    const ghostParent = await createTestCountrySector(prisma, {
      name: uniqueName("Ghost"),
      status: CountrySectorStatus.DELETED,
    });
    const sub = await createTestCountrySubsector(prisma, parent.id, {
      name: uniqueName("Sub"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-subsectors/${sub.id.toString()}`,
      payload: { countrySectorId: ghostParent.id.toString() },
    });
    expect(response.statusCode).toBe(404);
  });
});
