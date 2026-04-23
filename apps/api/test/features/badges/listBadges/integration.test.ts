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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus, SystemRole } from "@repo/database";
import type { ListBadgesResponse } from "@repo/types";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
  createReadSasUrlSigner: vi.fn().mockResolvedValue(
    vi.fn().mockResolvedValue({
      url: "https://mock.blob.core.windows.net/test/preview?sig=mock",
      expiresAt: new Date("2099-12-31T23:59:59.000Z"),
    })
  ),
}));

describe("GET /api/badges - listBadges Integration Tests", () => {
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
  });

  it("should return one group per BadgeType, even when no badges exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/badges",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ListBadgesResponse;
    const allTypes = Object.values(BadgeType);
    expect(body).toHaveLength(allTypes.length);
    for (const entry of body) {
      expect(allTypes).toContain(entry.type);
      expect(entry.active).toBeNull();
      expect(entry.history).toEqual([]);
    }
  });

  it("should return active and inactive badges grouped by type", async () => {
    const type = BadgeType.CARBON_INVENTORY_CALCULATION;
    const { badge: activeBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      type,
      { badgeOverrides: { status: BadgeStatus.ACTIVE } }
    );
    const { badge: inactiveBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      type,
      { badgeOverrides: { status: BadgeStatus.INACTIVE } }
    );

    const response = await app.inject({ method: "GET", url: "/api/badges" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ListBadgesResponse;

    const entry = body.find((e) => e.type === type)!;
    expect(entry.active).not.toBeNull();
    expect(entry.active!.id).toBe(activeBadge.id.toString());
    expect(entry.active!.status).toBe(BadgeStatus.ACTIVE);
    expect(entry.history).toHaveLength(1);
    expect(entry.history[0].id).toBe(inactiveBadge.id.toString());
    expect(entry.active!.previewUrl).toBeTruthy();
    expect(entry.history[0].previewUrl).toBeTruthy();
  });

  it("should cap history at 20 most recent inactive badges", async () => {
    const type = BadgeType.ORGANIZATION_ACCREDITATION;

    for (let i = 0; i < 25; i++) {
      await createTestFileForBadge(prisma, testUser.id, type, {
        badgeOverrides: { status: BadgeStatus.INACTIVE },
      });
    }

    const response = await app.inject({ method: "GET", url: "/api/badges" });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as ListBadgesResponse;

    const entry = body.find((e) => e.type === type)!;
    expect(entry.active).toBeNull();
    expect(entry.history).toHaveLength(20);
  });

  it("should return 403 for non-SUPERADMIN users", async () => {
    const originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({ method: "GET", url: "/api/badges" });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });
});
