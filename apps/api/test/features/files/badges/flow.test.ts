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
import { uploadFixture } from "@test/factories/storageHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus } from "@repo/database";
import type {
  RequestBadgeUploadResponse,
  ConfirmBadgeUploadResponse,
  GetBadgeFilesResponse,
} from "@repo/types";

describe("Badge files — Full upload flow: request-upload → upload → confirm-upload → get files", () => {
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

  it("should complete the full lifecycle for a CARBON_INVENTORY_CALCULATION badge", async () => {
    const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
    const originalName = "badge.png";

    // Step 1 – Request an upload URL
    const requestResponse = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/request-upload`,
      payload: { originalName },
    });

    expect(requestResponse.statusCode).toBe(200);
    const { uuid, uploadUrl, expiresAt } = JSON.parse(
      requestResponse.body
    ) as RequestBadgeUploadResponse;
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(uploadUrl).toBeTruthy();
    expect(expiresAt).toBeTruthy();

    // Step 2 – Simulate the client uploading the file.
    const blobPath = `BADGE/${badgeType}/${uuid}-${originalName}`;
    await uploadFixture(app.storage, blobPath, {
      contentType: "image/png",
    });

    // Step 3 – Confirm the upload
    const confirmResponse = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    expect(confirmResponse.statusCode).toBe(201);
    const { badge } = JSON.parse(
      confirmResponse.body
    ) as ConfirmBadgeUploadResponse;
    expect(badge.type).toBe(badgeType);
    expect(badge.status).toBe(BadgeStatus.INACTIVE);
    expect(badge.fileName).toBe(originalName);
    expect(badge.mimeType).toBe("image/png");
    expect(badge.previewUrl).toBeTruthy();

    // Step 4 – getBadgeFiles with no filter returns ACTIVE only, so nothing yet
    const listResponse = await app.inject({
      method: "GET",
      url: `/api/files/badge/${badgeType}`,
    });

    expect(listResponse.statusCode).toBe(200);
    const files = JSON.parse(listResponse.body) as GetBadgeFilesResponse;
    expect(files).toHaveLength(0);

    // Step 5 – Verify the DB records were created correctly
    const fileRecord = await prisma.file.findUnique({ where: { uuid } });
    expect(fileRecord).toBeDefined();

    const badgeRecord = await prisma.badge.findUnique({
      where: { fileId: fileRecord!.id },
    });
    expect(badgeRecord).toBeDefined();
    expect(badgeRecord?.type).toBe(badgeType);
    expect(badgeRecord?.status).toBe(BadgeStatus.INACTIVE);
  });

  it("should complete the full lifecycle for an ORGANIZATION_ACCREDITATION badge", async () => {
    const badgeType = BadgeType.ORGANIZATION_ACCREDITATION;
    const originalName = "org-badge.png";

    const { body: reqBody } = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/request-upload`,
      payload: { originalName },
    });
    const { uuid } = JSON.parse(reqBody) as RequestBadgeUploadResponse;

    await uploadFixture(
      app.storage,
      `BADGE/${badgeType}/${uuid}-${originalName}`,
      { contentType: "image/png" }
    );

    const confirmResponse = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    expect(confirmResponse.statusCode).toBe(201);
    const { badge } = JSON.parse(
      confirmResponse.body
    ) as ConfirmBadgeUploadResponse;
    expect(badge.status).toBe(BadgeStatus.INACTIVE);
  });

  it("should NOT deactivate the previous badge when a new one is confirmed (upload is non-destructive)", async () => {
    const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

    const { badge: firstBadge } = await createTestFileForBadge(
      prisma,
      testUser.id,
      badgeType,
      { badgeOverrides: { status: BadgeStatus.ACTIVE } }
    );
    expect(firstBadge.status).toBe(BadgeStatus.ACTIVE);

    const originalName = "new-badge.png";
    const { body: reqBody } = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/request-upload`,
      payload: { originalName },
    });
    const { uuid } = JSON.parse(reqBody) as RequestBadgeUploadResponse;
    await uploadFixture(
      app.storage,
      `BADGE/${badgeType}/${uuid}-${originalName}`,
      { contentType: "image/png" }
    );

    await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    // First badge must remain ACTIVE (upload is non-destructive)
    const reloaded = await prisma.badge.findUnique({
      where: { id: firstBadge.id },
    });
    expect(reloaded?.status).toBe(BadgeStatus.ACTIVE);
  });
});
