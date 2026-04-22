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
import { BadgeType, BadgeStatus } from "@repo/database";
import type { DeactivateBadgeResponse } from "@repo/types";

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
  });

  it("should deactivate the active badge and leave the type with zero actives", async () => {
    const type = BadgeType.CARBON_INVENTORY_CALCULATION;
    const { badge } = await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.ACTIVE },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${badge.id}/deactivate`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as DeactivateBadgeResponse;
    expect(body.type).toBe(type);
    expect(body.active).toBeNull();
    expect(body.history).toHaveLength(1);
    expect(body.history[0].id).toBe(badge.id.toString());
    expect(body.history[0].status).toBe(BadgeStatus.INACTIVE);

    const updated = await prisma.badge.findUnique({ where: { id: badge.id } });
    expect(updated?.status).toBe(BadgeStatus.INACTIVE);

    // Zero actives is valid — no DB constraint violation
    const activeCount = await prisma.badge.count({
      where: { type, status: BadgeStatus.ACTIVE },
    });
    expect(activeCount).toBe(0);
  });

  it("should be idempotent when deactivating an already-inactive badge", async () => {
    const type = BadgeType.ORGANIZATION_ACCREDITATION;
    const { badge } = await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.INACTIVE },
    });

    const response = await app.inject({
      method: "POST",
      url: `/api/badges/${badge.id}/deactivate`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as DeactivateBadgeResponse;
    expect(body.active).toBeNull();
    expect(body.history[0].id).toBe(badge.id.toString());
  });

  it("should return 404 for an unknown badge id", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/badges/999999999/deactivate",
    });

    expect(response.statusCode).toBe(404);
  });

  it("should not activate any replacement badge on deactivate", async () => {
    const type = BadgeType.REDUCTION_PROJECT_VERIFICATION;
    const { badge: active } = await createTestFileForBadge(
      prisma,
      testUser.id,
      type,
      { badgeOverrides: { status: BadgeStatus.ACTIVE } }
    );
    await createTestFileForBadge(prisma, testUser.id, type, {
      badgeOverrides: { status: BadgeStatus.INACTIVE },
    });

    await app.inject({
      method: "POST",
      url: `/api/badges/${active.id}/deactivate`,
    });

    const activeCount = await prisma.badge.count({
      where: { type, status: BadgeStatus.ACTIVE },
    });
    expect(activeCount).toBe(0);
  });
});
