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
  createTestFile,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { FileStatus } from "@repo/database";
import type { DownloadFileResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("GET /api/files/:uuid/download - Integration Tests", () => {
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

  describe("Happy path", () => {
    it("should return 200 with url and expiresAt for an ACTIVE file", async () => {
      const file = await createTestFile(prisma, testUser.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/files/${file.uuid}/download`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DownloadFileResponse;
      expect(body.url).toBeTruthy();
      expect(body.expiresAt).toBeTruthy();
    });

    it("should return a presigned download URL", async () => {
      const file = await createTestFile(prisma, testUser.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/files/${file.uuid}/download`,
      });

      const body = JSON.parse(response.body) as DownloadFileResponse;
      expect(body.url).toMatch(/^https?:\/\/.+/);
      expect(body.url).toContain(file.blobPath);
      expect(() => new Date(body.expiresAt)).not.toThrow();
    });
  });

  describe("Error cases", () => {
    it("should return 404 when the uuid does not match any file", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/00000000-0000-0000-0000-000000000000/download`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("should return 404 when the file is DELETED", async () => {
      const file = await createTestFile(prisma, testUser.id, {
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/files/${file.uuid}/download`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("should return 400 when uuid is not a valid UUID", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/not-a-uuid/download`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
