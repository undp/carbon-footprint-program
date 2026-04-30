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
  SystemRole,
} from "@repo/database";
import type { CreateCountryOrganizationSizeResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSizeCreate ";

describe("POST /api/admin/country-organization-sizes - Integration Tests", () => {
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

  it("creates a country organization size and returns 201", async () => {
    const name = uniqueName("Create");
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/",
      payload: { name, description: "A size" },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(
      response.body
    ) as CreateCountryOrganizationSizeResponse;
    expect(body.name).toBe(name);
    expect(body.status).toBe(CountryOrganizationSizeStatus.ACTIVE);

    const dbRow = await prisma.countryOrganizationSize.findUnique({
      where: { id: BigInt(body.id) },
    });
    expect(dbRow!.createdById).toBe(testUser.id);
  });

  it("returns 400 when name is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/",
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 400 when name is whitespace-only", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/",
      payload: { name: "   " },
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 409 when an ACTIVE size with the same name exists", async () => {
    const name = uniqueName("Dup");
    await createTestCountryOrganizationSize(prisma, { name });
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/country-organization-sizes/",
      payload: { name, description: null },
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
        url: "/api/admin/country-organization-sizes/",
        payload: { name: uniqueName("Forbidden"), description: null },
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
