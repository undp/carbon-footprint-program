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
import { getTestLoggedUser, cleanupTestUsers } from "@test/factories/userFactory.js";
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus, SystemRole } from "@repo/database";
import type {
  RequestBadgeUploadResponse,
  ConfirmBadgeUploadResponse,
} from "@repo/types";

vi.mock("@/services/blobService.js", () => ({
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

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupTestUsers(prisma);
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.SUPERADMIN },
    });
  });

  it("should complete the full upload lifecycle: new badge created as INACTIVE", async () => {
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

    // Step 2 – Simulate the client uploading the file
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
    const confirmedBody = JSON.parse(
      confirmResponse.body
    ) as ConfirmBadgeUploadResponse;
    expect(confirmedBody.badge).toBeDefined();
    expect(confirmedBody.badge.type).toBe(badgeType);
    expect(confirmedBody.badge.status).toBe(BadgeStatus.INACTIVE);
    expect(confirmedBody.badge.fileName).toBe(originalName);
    expect(confirmedBody.badge.mimeType).toBe("image/png");

    // Step 4 – Verify the DB record was created as INACTIVE
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
    const body = JSON.parse(confirmResponse.body) as ConfirmBadgeUploadResponse;
    expect(body.badge.status).toBe(BadgeStatus.INACTIVE);
  });

  it("should NOT deactivate the existing ACTIVE badge when a new badge is uploaded", async () => {
    const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

    // Upload first badge (creates an ACTIVE badge directly in DB)
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

    // First badge should still be ACTIVE — upload is non-destructive
    const firstBadge = await prisma.badge.findUnique({
      where: { fileId: firstFile.id },
    });
    expect(firstBadge?.status).toBe(BadgeStatus.ACTIVE);

    // New badge should be INACTIVE
    const newFile = await prisma.file.findUnique({ where: { uuid } });
    const newBadge = await prisma.badge.findUnique({
      where: { fileId: newFile!.id },
    });
    expect(newBadge?.status).toBe(BadgeStatus.INACTIVE);
  });

  describe("Authorization", () => {
    it("should return 403 for request-upload when called by ADMIN", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}/request-upload`,
        payload: { originalName: "badge.png" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 200 for request-upload when called by SUPERADMIN", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}/request-upload`,
        payload: { originalName: "badge.png" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should allow ADMIN to call getBadgeFiles", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should allow SUPERADMIN to call getBadgeFiles", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}`,
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
