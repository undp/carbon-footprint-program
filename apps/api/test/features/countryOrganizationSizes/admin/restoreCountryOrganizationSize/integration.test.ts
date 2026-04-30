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
import { createTestCountryOrganizationSize } from "@test/factories/countryOrganizationSizeFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import type { RestoreCountryOrganizationSizeResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSizeRes ";

describe("POST /api/admin/country-organization-sizes/:id/restore - Integration Tests", () => {
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
    await prisma.countryOrganizationSize.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("restores a DELETED size when no collision exists", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Restorable"),
      status: CountryOrganizationSizeStatus.DELETED,
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as RestoreCountryOrganizationSizeResponse;
    expect(body.status).toBe(CountryOrganizationSizeStatus.ACTIVE);
  });

  it("returns 409 when an ACTIVE collision exists on (countryId, name)", async () => {
    const name = uniqueName("Collision");
    await createTestCountryOrganizationSize(prisma, { name });
    const deleted = await createTestCountryOrganizationSize(prisma, {
      name,
      status: CountryOrganizationSizeStatus.DELETED,
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-organization-sizes/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the size is already ACTIVE", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("AlreadyActive"),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });
});
