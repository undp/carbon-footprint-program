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
import type { DeleteCountryOrganizationSizeResponse } from "@repo/types";
import { deleteCountryOrganizationSizeService } from "@/features/countryOrganizationSizes/admin/deleteCountryOrganizationSize/service.js";

const TEST_PREFIX = "Test - AdminSizeDel ";

describe("DELETE /api/admin/country-organization-sizes/:id - Integration Tests", () => {
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

  it("soft-deletes a clean row", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Clean"),
    });
    const response = await app.inject({
      method: "DELETE",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as DeleteCountryOrganizationSizeResponse;
    expect(body.status).toBe(CountryOrganizationSizeStatus.DELETED);
  });

  it("does NOT block when only user data references the size", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("UserData"),
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
      method: "DELETE",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
    });
    expect(response.statusCode).toBe(200);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/admin/country-organization-sizes/9999999999",
    });
    expect(response.statusCode).toBe(404);
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const size = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("NoUser"),
      });

      await expect(
        deleteCountryOrganizationSizeService(prisma, size.id.toString(), null)
      ).rejects.toThrow();
    });
  });
});
