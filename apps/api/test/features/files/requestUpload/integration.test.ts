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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { RequestUploadResponse } from "@repo/types";
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
}));

const validPayload = {
  originalName: "report.pdf",
  fileType: "SUBMISSION",
  sizeBytes: 1024,
  mimeType: "application/pdf",
};

describe("POST /api/files/request-upload - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let _testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageConnectionString: inject("storageConnectionString"),
      storageContainerName: inject("storageContainerName"),
    });
    prisma = app.prisma;
    _testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
  });

  describe("Happy path", () => {
    it("should return 200 with uuid, uploadUrl and expiresAt", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as RequestUploadResponse;
      expect(body.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(body.uploadUrl).toBeTruthy();
      expect(body.expiresAt).toBeTruthy();
    });

    it("should generate a different uuid on each call", async () => {
      const r1 = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: validPayload,
      });
      const r2 = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: validPayload,
      });

      expect((JSON.parse(r1.body) as RequestUploadResponse).uuid).not.toBe(
        (JSON.parse(r2.body) as RequestUploadResponse).uuid
      );
    });

    it("should accept any allowed extension/mime for the file type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          originalName: "evidence.xlsx",
          fileType: "CARBON_INVENTORY",
          sizeBytes: 2048,
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Validation errors (schema)", () => {
    it("should return 400 when originalName is missing", async () => {
      const { originalName: _o, ...rest } = validPayload;
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when fileType is missing", async () => {
      const { fileType: _f, ...rest } = validPayload;
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when fileType is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { ...validPayload, fileType: "INVALID" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when sizeBytes is missing", async () => {
      const { sizeBytes: _s, ...rest } = validPayload;
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when mimeType is missing", async () => {
      const { mimeType: _m, ...rest } = validPayload;
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: rest,
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when filename has path separators", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { ...validPayload, originalName: "../etc/passwd.pdf" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should accept Spanish accented filenames", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          ...validPayload,
          originalName: "informe-medición-año2023.pdf",
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 400 when filename contains Windows-reserved characters", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { ...validPayload, originalName: "report<bad>.pdf" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when filename starts with a dot", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { ...validPayload, originalName: ".hidden.pdf" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });
  });

  describe("Validation errors (policy)", () => {
    it("should return 400 when sizeBytes exceeds the global max", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { ...validPayload, sizeBytes: 999_999_999 },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_TOO_LARGE"
      );
    });

    it("should return 400 when sizeBytes exceeds the per-use-case max (badge)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          originalName: "logo.png",
          fileType: "BADGE",
          sizeBytes: 6 * 1024 * 1024,
          mimeType: "image/png",
        },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_TOO_LARGE"
      );
    });

    it("should return 400 when MIME type is not in the file type allowlist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          originalName: "doc.txt",
          fileType: "LEGAL",
          sizeBytes: 1024,
          mimeType: "text/plain",
        },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_MIME_TYPE_NOT_ALLOWED"
      );
    });

    it("should return 400 when extension does not match the file type", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          originalName: "doc.txt",
          fileType: "SUBMISSION",
          sizeBytes: 1024,
          mimeType: "application/pdf",
        },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_EXTENSION_NOT_ALLOWED"
      );
    });

    it("should return 400 when extension and declared MIME disagree", async () => {
      // Both ".png" and "application/pdf" are individually allowed for
      // SUBMISSION but they don't pair — the cross-check must reject.
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: {
          originalName: "tampered.png",
          fileType: "SUBMISSION",
          sizeBytes: 1024,
          mimeType: "application/pdf",
        },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        "FILE_MIME_EXTENSION_MISMATCH"
      );
    });
  });
});
