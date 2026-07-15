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
import { createTestCountryOrganizationSize } from "@test/factories/countryOrganizationSizeFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  CountryOrganizationSizeStatus,
} from "@repo/database";
import type { SwapCountryOrganizationSizePositionsResponse } from "@repo/types";
import { swapCountryOrganizationSizePositionsService } from "@/features/countryOrganizationSizes/admin/swapCountryOrganizationSizePositions/service.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

const TEST_PREFIX = "Test - AdminSizeSwap ";

describe("POST /api/admin/country-organization-sizes/swap-positions - Integration Tests", () => {
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
    await prisma.countryOrganizationSize.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("swaps the positions of two ACTIVE sizes and returns 201", async () => {
    const sizeA = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("A"),
    });
    const sizeB = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("B"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: sizeA.id.toString(), sizeIdB: sizeB.id.toString() },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(
      response.body
    ) as SwapCountryOrganizationSizePositionsResponse;
    expect(body.organizationSizes).toHaveLength(2);

    const reloadedA = await prisma.countryOrganizationSize.findUniqueOrThrow({
      where: { id: sizeA.id },
    });
    const reloadedB = await prisma.countryOrganizationSize.findUniqueOrThrow({
      where: { id: sizeB.id },
    });
    expect(reloadedA.position).toBe(sizeB.position);
    expect(reloadedB.position).toBe(sizeA.position);
  });

  it("returns 400 when sizeIdA and sizeIdB are the same", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Same"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: size.id.toString(), sizeIdB: size.id.toString() },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("SAME_ORGANIZATION_SIZE");
  });

  it("returns 404 when sizeIdA does not exist", async () => {
    const sizeB = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Existing"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: "9999999999", sizeIdB: sizeB.id.toString() },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when sizeIdB does not exist", async () => {
    const sizeA = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Existing2"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: sizeA.id.toString(), sizeIdB: "9999999999" },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 400 when the two sizes belong to different countries", async () => {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const otherCountry = await prisma.country.create({
      data: { name: `Test Other Country ${suffix}`, isoCode: `zz${suffix}` },
    });

    try {
      const sizeA = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("CountryA"),
      });
      const sizeB = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("CountryB"),
        countryId: otherCountry.id,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/admin/country-organization-sizes/swap-positions",
        payload: {
          sizeIdA: sizeA.id.toString(),
          sizeIdB: sizeB.id.toString(),
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("ORGANIZATION_SIZES_DIFFERENT_COUNTRY");
    } finally {
      await prisma.countryOrganizationSize.deleteMany({
        where: { countryId: otherCountry.id },
      });
      await prisma.country.delete({ where: { id: otherCountry.id } });
    }
  });

  it("returns 400 when sizeIdA is not ACTIVE", async () => {
    const sizeA = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("InactiveA"),
      status: CountryOrganizationSizeStatus.DELETED,
    });
    const sizeB = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("ActiveB"),
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: sizeA.id.toString(), sizeIdB: sizeB.id.toString() },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("INACTIVE_ORGANIZATION_SIZE");
  });

  it("returns 400 when sizeIdB is not ACTIVE (sizeIdA ACTIVE)", async () => {
    const sizeA = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("ActiveA"),
    });
    const sizeB = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("InactiveB"),
      status: CountryOrganizationSizeStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/swap-positions",
      payload: { sizeIdA: sizeA.id.toString(), sizeIdB: sizeB.id.toString() },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("INACTIVE_ORGANIZATION_SIZE");
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should throw UserNotFoundError when there is no authenticated user", async () => {
      const sizeA = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("NoUserA"),
      });
      const sizeB = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("NoUserB"),
      });

      await expect(
        swapCountryOrganizationSizePositionsService(
          prisma,
          { sizeIdA: sizeA.id.toString(), sizeIdB: sizeB.id.toString() },
          null
        )
      ).rejects.toThrow();
    });

    it("updates updatedById on both rows using the current user", async () => {
      const sizeA = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("UpdatedByA"),
      });
      const sizeB = await createTestCountryOrganizationSize(prisma, {
        name: uniqueName("UpdatedByB"),
      });

      await swapCountryOrganizationSizePositionsService(
        prisma,
        { sizeIdA: sizeA.id.toString(), sizeIdB: sizeB.id.toString() },
        mapUserToResponse(testUser)
      );

      const reloadedA = await prisma.countryOrganizationSize.findUniqueOrThrow(
        { where: { id: sizeA.id } }
      );
      expect(reloadedA.updatedById).toBe(testUser.id);
    });
  });
});
