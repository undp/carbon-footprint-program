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
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { ConfirmUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";
import { DatabaseUniqueConstraintViolationError } from "@/errors/index.js";

// SAS generation requires Azure AD auth, not supported by Azurite shared-key mode.
vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn(),
}));

describe("POST /api/files/confirm-upload - Integration Tests", () => {
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
    it("should return 201 with uuid when the blob exists at the tmp path", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const originalName = "report.pdf";

      // Blob lands at the tmp namespace: SUBMISSION/tmp/uuid-name
      const blobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "application/pdf",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as ConfirmUploadResponse;
      expect(body.uuid).toBe(uuid);
    });

    it("should create a File DB record with the tmp blobPath", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440001";
      const originalName = "document.pdf";
      const blobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;

      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "application/pdf",
      });

      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeDefined();
      expect(fileRecord?.originalName).toBe(originalName);
      expect(fileRecord?.blobPath).toBe(blobPath);
      expect(fileRecord?.createdById).toBe(testUser.id);
    });

    it("should NOT create a SubmissionFile record (linking happens at submission creation)", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440002";
      const originalName = "attachment.pdf";

      await uploadBlobToAzurite(
        app.blobStorage!,
        `SUBMISSION/tmp/${uuid}-${originalName}`,
        { contentType: "application/pdf" }
      );

      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const fileRecord = await prisma.file.findUnique({
        where: { uuid },
        include: { submissionFiles: true },
      });
      expect(fileRecord?.submissionFiles).toHaveLength(0);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when the blob does not exist at the tmp path", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: {
          uuid: "550e8400-e29b-41d4-a716-446655440003",
          originalName: "ghost.pdf",
          fileType: "SUBMISSION",
        },
      });

      expect(response.statusCode).toBe(404);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_NOT_FOUND"
      );
    });

    it("should return 400 when uuid is not a valid UUID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: {
          uuid: "not-a-uuid",
          originalName: "file.pdf",
          fileType: "SUBMISSION",
        },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when required body fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 and delete the blob when its size exceeds the limit", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440020";
      const originalName = "oversized.png";
      const blobPath = `BADGE/tmp/${uuid}-${originalName}`;
      // Badge policy caps at 5 MB; upload something just over.
      const oversized = "x".repeat(5 * 1024 * 1024 + 1);
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        content: oversized,
        contentType: "image/png",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "BADGE" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_TOO_LARGE"
      );

      const exists = await app
        .blobStorage!.getBlockBlobClient(blobPath)
        .exists();
      expect(exists).toBe(false);

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeNull();
    });

    it("should return 400 and delete the blob when MIME does not match the file type", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440021";
      const originalName = "tampered.pdf";
      const blobPath = `LEGAL/tmp/${uuid}-${originalName}`;
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "text/plain",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "LEGAL" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_MIME_TYPE_NOT_ALLOWED"
      );

      const exists = await app
        .blobStorage!.getBlockBlobClient(blobPath)
        .exists();
      expect(exists).toBe(false);
    });

    it("should return 400 with FILE_TOO_SMALL when the blob is below the minimum size", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440023";
      const originalName = "empty.pdf";
      const blobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;
      // FILE_UPLOAD_MIN_BYTES is 1; an empty blob is the only way to land
      // below the minimum without rewriting the schema.
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        content: "",
        contentType: "application/pdf",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_TOO_SMALL"
      );

      const exists = await app
        .blobStorage!.getBlockBlobClient(blobPath)
        .exists();
      expect(exists).toBe(false);

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeNull();
    });

    it("should return 400 and delete the blob when extension does not match the file type", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440022";
      // SUBMISSION policy accepts pdf/png/jpg/jpeg/webp/xls/xlsx — not .txt.
      // The blob's content-type is allowed (application/pdf), so the failure
      // hits the extension check, not the MIME check.
      const originalName = "report.txt";
      const blobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;
      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "application/pdf",
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_EXTENSION_NOT_ALLOWED"
      );

      const exists = await app
        .blobStorage!.getBlockBlobClient(blobPath)
        .exists();
      expect(exists).toBe(false);

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeNull();
    });

    it("should return 409 when the same uuid is confirmed twice", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440010";
      const originalName = "duplicate.pdf";
      const blobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;

      await uploadBlobToAzurite(app.blobStorage!, blobPath, {
        contentType: "application/pdf",
      });

      await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(409);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        new DatabaseUniqueConstraintViolationError().code
      );
    });
  });
});
