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
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import type { GetAllAdminCountryOrganizationSizesResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSizeList ";

describe("GET /api/admin/country-organization-sizes - Integration Tests", () => {
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
    await prisma.countryOrganizationSize.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("default returns ACTIVE rows only", async () => {
    const active = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Active"),
    });
    const deleted = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Deleted"),
      status: CountryOrganizationSizeStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-organization-sizes/",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountryOrganizationSizesResponse;
    const ids = body.map((r) => r.id);
    expect(ids).toContain(active.id.toString());
    expect(ids).not.toContain(deleted.id.toString());
  });

  it("status=deleted returns DELETED rows only", async () => {
    const active = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Active2"),
    });
    const deleted = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Deleted2"),
      status: CountryOrganizationSizeStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-organization-sizes/?status=deleted",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountryOrganizationSizesResponse;
    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === active.id.toString())).toBeUndefined();
  });

  it("status=all returns both", async () => {
    const active = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Active3"),
    });
    const deleted = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Deleted3"),
      status: CountryOrganizationSizeStatus.DELETED,
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-organization-sizes/?status=all",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountryOrganizationSizesResponse;
    expect(body.find((r) => r.id === active.id.toString())).toBeDefined();
    expect(body.find((r) => r.id === deleted.id.toString())).toBeDefined();
  });

  it("isInUse flips to true when an ACTIVE organization references the size", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("InUse"),
    });
    const organization = await createTestOrganization(prisma);
    await prisma.organizationData.create({
      data: {
        organizationId: organization.id,
        legalName: "Test Org",
        countryOrganizationSizeId: size.id,
        updatedAt: null,
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-organization-sizes/?status=active",
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetAllAdminCountryOrganizationSizesResponse;
    const row = body.find((r) => r.id === size.id.toString());
    expect(row).toBeDefined();
    expect(row!.isInUse).toBe(true);
  });

  it("returns 400 for an invalid status value", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/country-organization-sizes/?status=garbage",
    });
    expect(response.statusCode).toBe(400);
  });
});
