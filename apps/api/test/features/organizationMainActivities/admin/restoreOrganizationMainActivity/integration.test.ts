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
import { createTestOrganizationMainActivity } from "@test/factories/organizationMainActivityFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  OrganizationMainActivityStatus,
} from "@repo/database";
import type { RestoreOrganizationMainActivityResponse } from "@repo/types";

const TEST_PREFIX = "Test - AdminMARes ";

describe("POST /api/admin/organization-main-activities/:id/restore - Integration Tests", () => {
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
    await prisma.organizationMainActivity.deleteMany({
      where: { name: { startsWith: TEST_PREFIX } },
    });
  });

  function uniqueName(suffix: string): string {
    const random = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return `${TEST_PREFIX}${suffix} ${random}`;
  }

  it("restores a DELETED main activity", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("Restorable"),
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as RestoreOrganizationMainActivityResponse;
    expect(body.status).toBe(OrganizationMainActivityStatus.ACTIVE);
  });

  it("returns 409 when an ACTIVE collision exists on (name, sectorId, subsectorId)", async () => {
    const name = uniqueName("Collision");
    await createTestOrganizationMainActivity(prisma, { name });
    const deleted = await createTestOrganizationMainActivity(prisma, {
      name,
      status: OrganizationMainActivityStatus.DELETED,
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${deleted.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("returns 400 when the main activity is already ACTIVE", async () => {
    const ma = await createTestOrganizationMainActivity(prisma, {
      name: uniqueName("AlreadyActive"),
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/admin/organization-main-activities/${ma.id.toString()}/restore`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("returns 404 when id does not exist", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/admin/organization-main-activities/9999999999/restore",
    });
    expect(response.statusCode).toBe(404);
  });
});
