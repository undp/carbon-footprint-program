import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
  vi,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  getTestLoggedUser,
  cleanupTestUsers,
} from "@test/factories/userFactory.js";
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus, SystemRole } from "@repo/database";
import type { DeactivateBadgeResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/badge?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe("POST /api/badges/:id/deactivate - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageConnectionString: inject("storageConnectionString"),
      storageContainerName: inject("storageContainerName"),
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
    await cleanupTestUsers(prisma);
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.SUPERADMIN },
    });
  });

  describe("Successful deactivation", () => {
    it("should deactivate the active badge, leaving the type with zero active badges", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const { badge } = await createTestFileForBadge(prisma, testUser.id, badgeType);

      const response = await app.inject({
        method: "POST",
        url: `/api/badges/${badge.id}/deactivate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeactivateBadgeResponse;
      expect(body.type).toBe(badgeType);
      expect(body.active).toBeNull();

      const updated = await prisma.badge.findUnique({ where: { id: badge.id } });
      expect(updated?.status).toBe(BadgeStatus.INACTIVE);

      // The deactivated badge should appear in history
      const historyEntry = body.history.find((h) => h.id === badge.id.toString());
      expect(historyEntry).toBeDefined();

      // Zero-active state must not violate the DB partial unique index
      const activeCount = await prisma.badge.count({
        where: { type: badgeType, status: BadgeStatus.ACTIVE },
      });
      expect(activeCount).toBe(0);
    });

    it("should be idempotent when deactivating an already-inactive badge", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const { badge } = await createTestFileForBadge(prisma, testUser.id, badgeType, {
        badgeOverrides: { status: BadgeStatus.INACTIVE },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/badges/${badge.id}/deactivate`,
      });

      expect(response.statusCode).toBe(200);
      const unchanged = await prisma.badge.findUnique({ where: { id: badge.id } });
      expect(unchanged?.status).toBe(BadgeStatus.INACTIVE);
    });

    it("should not activate any replacement when deactivating", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

      const { badge: activeBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType
      );
      // Also have an inactive badge that should NOT get auto-activated
      const { badge: inactiveBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType,
        { badgeOverrides: { status: BadgeStatus.INACTIVE } }
      );

      await app.inject({
        method: "POST",
        url: `/api/badges/${activeBadge.id}/deactivate`,
      });

      const stillInactive = await prisma.badge.findUnique({
        where: { id: inactiveBadge.id },
      });
      expect(stillInactive?.status).toBe(BadgeStatus.INACTIVE);
    });
  });

  describe("Error cases", () => {
    it("should return 404 for an unknown badge id", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/badges/999999999/deactivate",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("BADGE_NOT_FOUND");
    });

    it("should return 403 for non-SUPERADMIN", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/badges/1/deactivate",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
