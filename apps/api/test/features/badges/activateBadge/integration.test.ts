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
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus } from "@repo/database";
import type { ActivateBadgeResponse } from "@repo/types";

describe("POST /api/badges/:id/activate - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
    });
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
  });

  it("should activate an inactive badge when no other is active", async () => {
    const type = BadgeType.CARBON_INVENTORY_CALCULATION;
    const { badge } = await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.INACTIVE },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${badge.id}/activate`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ActivateBadgeResponse;
    expect(body.type).toBe(type);
    expect(body.active).not.toBeNull();
    expect(body.active!.id).toBe(badge.id.toString());
    expect(body.active!.status).toBe(BadgeStatus.ACTIVE);
    expect(body.history).toEqual([]);

    const updated = await prisma.badge.findUnique({ where: { id: badge.id } });
    expect(updated?.status).toBe(BadgeStatus.ACTIVE);
  });

  it("should demote the incumbent badge atomically when activating another", async () => {
    const type = BadgeType.CARBON_INVENTORY_CALCULATION;
    const { badge: incumbent } = await createTestFileForBadge(
      prisma,
      testUser.id,
      type,
      { badgeOverrides: { status: BadgeStatus.ACTIVE } }
    );
    const { badge: candidate } = await createTestFileForBadge(
      prisma,
      testUser.id,
      type,
      { badgeOverrides: { status: BadgeStatus.INACTIVE } }
    );

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${candidate.id}/activate`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ActivateBadgeResponse;
    expect(body.active!.id).toBe(candidate.id.toString());
    expect(body.history).toHaveLength(1);
    expect(body.history[0].id).toBe(incumbent.id.toString());

    const reloadedIncumbent = await prisma.badge.findUnique({
      where: { id: incumbent.id },
    });
    expect(reloadedIncumbent?.status).toBe(BadgeStatus.INACTIVE);

    // Verify DB partial unique index: still only one ACTIVE per type
    const activeCount = await prisma.badge.count({
      where: { type, status: BadgeStatus.ACTIVE },
    });
    expect(activeCount).toBe(1);
  });

  it("should be idempotent when activating an already-active badge", async () => {
    const type = BadgeType.ORGANIZATION_ACCREDITATION;
    const { badge } = await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.ACTIVE },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${badge.id}/activate`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ActivateBadgeResponse;
    expect(body.active!.id).toBe(badge.id.toString());
    expect(body.active!.status).toBe(BadgeStatus.ACTIVE);
  });

  it("should return 404 for an unknown badge id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/badges/999999999/activate",
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return signed preview URLs for all returned badges", async () => {
    const type = BadgeType.CARBON_INVENTORY_CALCULATION;
    const { badge } = await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.INACTIVE },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${badge.id}/activate`,
    });

    const body = JSON.parse(response.body) as ActivateBadgeResponse;
    expect(body.active!.previewUrl).toBeTruthy();
  });
});
