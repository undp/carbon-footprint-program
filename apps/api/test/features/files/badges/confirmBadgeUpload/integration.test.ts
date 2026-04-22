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
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus } from "@repo/database";
import type { ConfirmBadgeUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

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

describe("POST /api/files/badge/:badgeType/confirm-upload - Integration Tests", () => {
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

  describe("Happy path", () => {
    it("should create file and INACTIVE badge DB records when blob exists", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const uuid = "660e8400-e29b-41d4-a716-446655440000";
      const originalName = "badge.png";

      const blobPath = `BADGE/${badgeType}/${uuid}-${originalName}`;
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "image/png",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${badgeType}/confirm-upload`,
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as ConfirmBadgeUploadResponse;
      expect(body.badge.type).toBe(badgeType);
      expect(body.badge.status).toBe(BadgeStatus.INACTIVE);
      expect(body.badge.fileName).toBe(originalName);
      expect(body.badge.mimeType).toBe("image/png");
      expect(body.badge.previewUrl).toBeTruthy();
    });

    it("should persist the correct metadata in the database", async () => {
      const badgeType = BadgeType.ORGANIZATION_ACCREDITATION;
      const uuid = "660e8400-e29b-41d4-a716-446655440001";
      const originalName = "org-badge.png";

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

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeDefined();
      expect(fileRecord?.originalName).toBe(originalName);

      const badgeRecord = await prisma.badge.findUnique({
        where: { fileId: fileRecord!.id },
      });
      expect(badgeRecord).toBeDefined();
      expect(badgeRecord?.type).toBe(badgeType);
      expect(badgeRecord?.status).toBe(BadgeStatus.INACTIVE);
    });

    it("should NOT deactivate the existing ACTIVE badge of the same type (upload is non-destructive)", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;

      const { badge: existingBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType,
        { badgeOverrides: { status: BadgeStatus.ACTIVE } }
      );
      expect(existingBadge.status).toBe(BadgeStatus.ACTIVE);

      const uuid = "660e8400-e29b-41d4-a716-446655440002";
      const originalName = "new-badge.png";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `BADGE/${badgeType}/${uuid}-${originalName}`,
        { contentType: "image/png" }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${badgeType}/confirm-upload`,
        payload: { uuid, originalName },
      });
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as ConfirmBadgeUploadResponse;
      expect(body.badge.status).toBe(BadgeStatus.INACTIVE);

      // Existing active badge must remain ACTIVE
      const updatedBadge = await prisma.badge.findUnique({
        where: { id: existingBadge.id },
      });
      expect(updatedBadge?.status).toBe(BadgeStatus.ACTIVE);

      // New badge is INACTIVE
      const newFile = await prisma.file.findUnique({ where: { uuid } });
      const newBadge = await prisma.badge.findUnique({
        where: { fileId: newFile!.id },
      });
      expect(newBadge?.status).toBe(BadgeStatus.INACTIVE);
    });
  });

  describe("File validation", () => {
    it("should reject a disallowed MIME type with 400 and not create records", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const uuid = "660e8400-e29b-41d4-a716-446655440010";
      const originalName = "document.pdf";
      const blobPath = `BADGE/${badgeType}/${uuid}-${originalName}`;

      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "application/pdf",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${badgeType}/confirm-upload`,
        payload: { uuid, originalName },
      });

      expect(response.statusCode).toBe(400);
      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeNull();
    });

    it("should leave an existing ACTIVE badge unchanged when mime validation fails", async () => {
      const badgeType = BadgeType.CARBON_INVENTORY_CALCULATION;
      const { badge: existingBadge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        badgeType,
        { badgeOverrides: { status: BadgeStatus.ACTIVE } }
      );

      const uuid = "660e8400-e29b-41d4-a716-446655440011";
      const originalName = "bad.pdf";
      await uploadBlobToAzurite(
        app.blobStorage!,
        `BADGE/${badgeType}/${uuid}-${originalName}`,
        { contentType: "application/pdf" }
      );

      await app.inject({
        method: "POST",
        url: `/api/files/badge/${badgeType}/confirm-upload`,
        payload: { uuid, originalName },
      });

      const unchanged = await prisma.badge.findUnique({
        where: { id: existingBadge.id },
      });
      expect(unchanged?.status).toBe(BadgeStatus.ACTIVE);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when the blob does not exist in storage", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}/confirm-upload`,
        payload: {
          uuid: "660e8400-e29b-41d4-a716-446655440099",
          originalName: "ghost.png",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("should return 400 when badgeType is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/INVALID_TYPE/confirm-upload`,
        payload: {
          uuid: "660e8400-e29b-41d4-a716-446655440000",
          originalName: "badge.png",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when uuid is not a valid UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}/confirm-upload`,
        payload: {
          uuid: "not-a-uuid",
          originalName: "badge.png",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when required body fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY_CALCULATION}/confirm-upload`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
