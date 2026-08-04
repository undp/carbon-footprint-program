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
import { BadgeType } from "@repo/database";
import type { GetBadgePreviewsResponse } from "@repo/types";

// Public endpoint (no auth) that signs preview URLs for every ACTIVE badge.
// Exercises the optional badgeTypes filter (optional-chain + &&) and the
// nullish-coalescing fallback on a badge whose file has no mimeType.

describe("GET /api/badges/previews - getBadgePreviews Integration Tests", () => {
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

  it("returns an empty array when there are no active badges", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/badges/previews",
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
  });

  it("returns previews for every active badge when no badgeTypes filter is given", async () => {
    // NOTE: file.mime_type is NOT NULL at the DB level (and Prisma's client
    // validates this too), so a real null mimeType can't be persisted here —
    // the `?? undefined` fallback on badge.file.mimeType is defensive/
    // unreachable via this route given the current schema. We still exercise
    // the surrounding optional-chain/&& badgeTypes branch and the mapping.
    const { badge: calcBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_CALCULATION
    );
    const { badge: verificationBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_VERIFICATION
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/badges/previews",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetBadgePreviewsResponse;

    expect(body).toHaveLength(2);
    const types = body.map((entry) => entry.badgeType);
    expect(types).toEqual(
      expect.arrayContaining([calcBadge.type, verificationBadge.type])
    );
    for (const entry of body) {
      expect(entry.previewUrl).toMatch(/^https?:\/\//);
    }
  });

  it("filters previews down to the requested badgeTypes", async () => {
    await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_CALCULATION
    );
    await createTestFileForBadge(
      prisma,
      testUser.id,
      BadgeType.CARBON_INVENTORY_VERIFICATION
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/badges/previews?badgeTypes=${BadgeType.CARBON_INVENTORY_CALCULATION}`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetBadgePreviewsResponse;

    expect(body).toHaveLength(1);
    expect(body[0].badgeType).toBe(BadgeType.CARBON_INVENTORY_CALCULATION);
    expect(body[0].previewUrl).toMatch(/^https?:\/\//);
  });
});
