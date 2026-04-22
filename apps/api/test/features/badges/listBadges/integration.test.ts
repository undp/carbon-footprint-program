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
import type { ListBadgesResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/badge?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe("GET /api/badges - Integration Tests", () => {
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

  describe("Catalog structure", () => {
    it("should return one entry per BadgeType even with no badges in the DB", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListBadgesResponse;

      const allTypes = Object.values(BadgeType);
      expect(body).toHaveLength(allTypes.length);

      for (const type of allTypes) {
        const entry = body.find((e) => e.type === type);
        expect(entry).toBeDefined();
        expect(entry!.active).toBeNull();
        expect(entry!.history).toEqual([]);
      }
    });

    it("should populate active and history for a type that has badges", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

      // Create one ACTIVE badge
      const { badge: activeBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType
      );

      // Create one INACTIVE badge
      const { badge: inactiveBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType,
        { badgeOverrides: { status: BadgeStatus.INACTIVE } }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListBadgesResponse;
      const entry = body.find((e) => e.type === badgeType)!;

      expect(entry.active).not.toBeNull();
      expect(entry.active!.id).toBe(activeBadge.id.toString());
      expect(entry.active!.status).toBe(BadgeStatus.ACTIVE);
      expect(entry.active!.previewUrl).toBeTruthy();

      expect(entry.history).toHaveLength(1);
      expect(entry.history[0].id).toBe(inactiveBadge.id.toString());
      expect(entry.history[0].status).toBe(BadgeStatus.INACTIVE);
    });

    it("should return active: null for types with no badges", async () => {
      // Seed one type but leave others empty
      await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY_CALCULATION
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListBadgesResponse;

      const emptyType = body.find(
        (e) => e.type === BadgeType.ORGANIZATION_ACCREDITATION
      );
      expect(emptyType!.active).toBeNull();
      expect(emptyType!.history).toEqual([]);
    });
  });

  describe("History cap", () => {
    it("should cap history at 20 per type when more than 20 inactive badges exist", async () => {
      const badgeType = BadgeType.REDUCTION_PROJECT_VERIFICATION;

      // Create 25 inactive badges
      for (let i = 0; i < 25; i++) {
        await createTestFileForBadge(prisma, testUser.id, badgeType, {
          badgeOverrides: { status: BadgeStatus.INACTIVE },
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListBadgesResponse;
      const entry = body.find((e) => e.type === badgeType)!;

      expect(entry.active).toBeNull();
      expect(entry.history).toHaveLength(20);
    });
  });

  describe("Preview URLs", () => {
    it("should include a previewUrl on each badge (active and inactive)", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

      await createTestFileForBadge(prisma, testUser.id, badgeType);
      await createTestFileForBadge(prisma, testUser.id, badgeType, {
        badgeOverrides: { status: BadgeStatus.INACTIVE },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListBadgesResponse;
      const entry = body.find((e) => e.type === badgeType)!;

      expect(entry.active!.previewUrl).toMatch(/^https:\/\//);
      expect(entry.history[0].previewUrl).toMatch(/^https:\/\//);
    });
  });

  describe("Authorization", () => {
    it("should return 403 for non-SUPERADMIN", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 200 for SUPERADMIN", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/badges",
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
