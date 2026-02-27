import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
  vi,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus, FileStatus } from "@repo/database";
import type {
  RequestBadgeUploadResponse,
  ConfirmBadgeUploadResponse,
  GetBadgeFilesResponse,
} from "@repo/types";

vi.mock("@/features/files/helpers/sasHelper.js", () => ({
  generateWriteSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe("Badge files — Full upload flow: request-upload → upload → confirm-upload → get files", () => {
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

  beforeEach(async () => {
    await cleanupTestFiles(prisma);
  });

  it("should complete the full lifecycle for a CARBON_INVENTORY badge", async () => {
    const badgeType = BadgeType.CARBON_INVENTORY;
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

    // Step 2 – Simulate the client uploading the file. The blob path mirrors
    // buildBlobPath({ fileType: "BADGE", groupKey: badgeType, uuid, name }).
    const blobPath = `BADGE/${badgeType}/${uuid}-${originalName}`;
    await uploadBlobToAzurite(app.blobStorage!, blobPath, {
      contentType: "image/png",
    });

    // Step 3 – Confirm the upload
    const confirmResponse = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    expect(confirmResponse.statusCode).toBe(201);
    const confirmedFile = JSON.parse(
      confirmResponse.body
    ) as ConfirmBadgeUploadResponse;
    expect(confirmedFile.uuid).toBe(uuid);
    expect(confirmedFile.originalName).toBe(originalName);
    expect(confirmedFile.mimeType).toBe("image/png");
    expect(confirmedFile.sizeBytes).toBeGreaterThan(0);
    expect(confirmedFile.status).toBe(FileStatus.ACTIVE);

    // Step 4 – Verify the file appears when listing badge files
    const listResponse = await app.inject({
      method: "GET",
      url: `/api/files/badge/${badgeType}`,
    });

    expect(listResponse.statusCode).toBe(200);
    const files = JSON.parse(listResponse.body) as GetBadgeFilesResponse;
    expect(files).toHaveLength(1);
    expect(files[0].uuid).toBe(uuid);

    // Step 5 – Verify the DB records were created correctly
    const fileRecord = await prisma.file.findUnique({ where: { uuid } });
    expect(fileRecord).toBeDefined();
    expect(fileRecord?.createdById).toBe(testUser.id);

    const badgeRecord = await prisma.badge.findUnique({
      where: { fileId: fileRecord!.id },
    });
    expect(badgeRecord).toBeDefined();
    expect(badgeRecord?.type).toBe(badgeType);
    expect(badgeRecord?.status).toBe(BadgeStatus.ACTIVE);
  });

  it("should complete the full lifecycle for an ORGANIZATION_DATA badge", async () => {
    const badgeType = BadgeType.ORGANIZATION_DATA;
    const originalName = "org-badge.png";

    const { body: reqBody } = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/request-upload`,
      payload: { originalName },
    });
    const { uuid } = JSON.parse(reqBody) as RequestBadgeUploadResponse;

    await uploadBlobToAzurite(
      app.blobStorage!,
      `BADGE/${badgeType}/${uuid}-${originalName}`,
      { contentType: "image/png" }
    );

    const confirmResponse = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    expect(confirmResponse.statusCode).toBe(201);

    const listResponse = await app.inject({
      method: "GET",
      url: `/api/files/badge/${badgeType}`,
    });

    expect(listResponse.statusCode).toBe(200);
    expect(JSON.parse(listResponse.body) as GetBadgeFilesResponse).toHaveLength(
      1
    );
  });

  it("should deactivate the previous badge when a new one is confirmed", async () => {
    const badgeType = BadgeType.CARBON_INVENTORY;

    // Upload first badge
    const { file: firstFile } = await createTestFileForBadge(
      prisma,
      testUser.id,
      badgeType
    );

    // Upload second badge via the full flow
    const originalName = "new-badge.png";
    const { body: reqBody } = await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/request-upload`,
      payload: { originalName },
    });
    const { uuid } = JSON.parse(reqBody) as RequestBadgeUploadResponse;
    await uploadBlobToAzurite(
      app.blobStorage!,
      `BADGE/${badgeType}/${uuid}-${originalName}`,
      { contentType: "image/png" }
    );

    await app.inject({
      method: "POST",
      url: `/api/files/badge/${badgeType}/confirm-upload`,
      payload: { uuid, originalName },
    });

    // Only the new badge should be returned (previous is INACTIVE)
    const listResponse = await app.inject({
      method: "GET",
      url: `/api/files/badge/${badgeType}`,
    });

    expect(listResponse.statusCode).toBe(200);
    const files = JSON.parse(listResponse.body) as GetBadgeFilesResponse;
    expect(files).toHaveLength(1);
    expect(files[0].uuid).toBe(uuid);
    expect(files[0].uuid).not.toBe(firstFile.uuid);

    // Verify the first badge was deactivated in the DB
    const firstBadge = await prisma.badge.findUnique({
      where: { fileId: firstFile.id },
    });
    expect(firstBadge?.status).toBe(BadgeStatus.INACTIVE);
  });
});
