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
import { type PrismaClient } from "@repo/database";
import type { UpdateCountryOrganizationSizeResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminSizeUpd ";

describe("PATCH /api/admin/country-organization-sizes/:id - Integration Tests", () => {
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

  it("partial update of name", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Old"),
    });
    const newName = uniqueName("New");
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { name: newName },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateCountryOrganizationSizeResponse;
    expect(body.name).toBe(newName);
  });

  it("description tri-state: empty string clears the value", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Cleared"),
      description: "to clear",
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { description: "" },
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as UpdateCountryOrganizationSizeResponse;
    expect(body.description).toBeNull();
  });

  it("returns 400 with empty body", async () => {
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("EmptyBody"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/country-organization-sizes/9999999999",
      payload: { name: uniqueName("X") },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 409 when renaming into an existing ACTIVE name", async () => {
    const taken = uniqueName("Taken");
    await createTestCountryOrganizationSize(prisma, { name: taken });
    const size = await createTestCountryOrganizationSize(prisma, {
      name: uniqueName("Mine"),
    });
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/country-organization-sizes/${size.id.toString()}`,
      payload: { name: taken },
    });
    expect(response.statusCode).toBe(409);
  });
});
