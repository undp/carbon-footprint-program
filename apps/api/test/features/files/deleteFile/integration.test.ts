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
import type { DeleteFileResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("DELETE /api/files/:uuid - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
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
    it("should return 200 with message and uuid when file is ACTIVE", async () => {
      const file = await createTestFile(prisma, testUser.id);

      const response = await app.inject({
        method: "DELETE",
        url: `/api/files/${file.uuid}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeleteFileResponse;
      expect(body.message).toBeTruthy();
      expect(body.uuid).toBe(file.uuid);
    });

    it("should soft-delete the file (status DELETED, deletedAt set)", async () => {
      const file = await createTestFile(prisma, testUser.id);

      await app.inject({
        method: "DELETE",
        url: `/api/files/${file.uuid}`,
      });

      const updated = await prisma.file.findUnique({
        where: { uuid: file.uuid },
      });
      expect(updated?.status).toBe(FileStatus.DELETED);
      expect(updated?.deletedAt).not.toBeNull();
    });
  });

  describe("Error cases", () => {
    it("should return 404 when the uuid does not match any file", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/files/00000000-0000-0000-0000-000000000000`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("should return 404 when the file is already DELETED", async () => {
      const file = await createTestFile(prisma, testUser.id, {
        status: FileStatus.DELETED,
        deletedAt: new Date(),
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/files/${file.uuid}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_NOT_FOUND");
    });

    it("should return 400 when uuid is not a valid UUID", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/files/not-a-uuid`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
