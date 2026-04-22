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
import type { ActivateBadgeResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/badge?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe("POST /api/badges/:id/activate - Integration Tests", () => {
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

  describe("Successful activation", () => {
    it("should activate an inactive badge when no other badge of that type is active", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const { badge } = await createTestFileForBadge(prisma, testUser.id, badgeType, {
        badgeOverrides: { status: BadgeStatus.INACTIVE },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/badges/${badge.id}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ActivateBadgeResponse;
      expect(body.type).toBe(badgeType);
      expect(body.active).not.toBeNull();
      expect(body.active!.id).toBe(badge.id.toString());
      expect(body.active!.status).toBe(BadgeStatus.ACTIVE);

      const updated = await prisma.badge.findUnique({ where: { id: badge.id } });
      expect(updated?.status).toBe(BadgeStatus.ACTIVE);
    });

    it("should demote the incumbent and activate the new badge atomically when another badge is active", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

      const { badge: incumbent } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType
      ); // ACTIVE by default

      const { badge: target } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType,
        { badgeOverrides: { status: BadgeStatus.INACTIVE } }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/badges/${target.id}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ActivateBadgeResponse;
      expect(body.active!.id).toBe(target.id.toString());

      const updatedIncumbent = await prisma.badge.findUnique({ where: { id: incumbent.id } });
      expect(updatedIncumbent?.status).toBe(BadgeStatus.INACTIVE);

      const updatedTarget = await prisma.badge.findUnique({ where: { id: target.id } });
      expect(updatedTarget?.status).toBe(BadgeStatus.ACTIVE);

      // DB partial unique index must remain satisfied: only one ACTIVE per type
      const activeCount = await prisma.badge.count({
        where: { type: badgeType, status: BadgeStatus.ACTIVE },
      });
      expect(activeCount).toBe(1);
    });

    it("should be idempotent when activating an already-active badge", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const { badge } = await createTestFileForBadge(prisma, testUser.id, badgeType);

      const response = await app.inject({
        method: "POST",
        url: `/api/badges/${badge.id}/activate`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ActivateBadgeResponse;
      expect(body.active!.id).toBe(badge.id.toString());

      const unchanged = await prisma.badge.findUnique({ where: { id: badge.id } });
      expect(unchanged?.status).toBe(BadgeStatus.ACTIVE);
    });
  });

  describe("Error cases", () => {
    it("should return 404 for an unknown badge id", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/badges/999999999/activate",
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
        url: "/api/badges/1/activate",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });
});
