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
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { RequestUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("POST /api/files/request-upload - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let _testUser: User;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageDescriptor: inject("storageDescriptor"),
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
        payload: { originalName: "report.pdf", fileType: "SUBMISSION" },
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
      const payload = { originalName: "file.pdf", fileType: "SUBMISSION" };

      const r1 = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload,
      });
      const r2 = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload,
      });

      expect((JSON.parse(r1.body) as RequestUploadResponse).uuid).not.toBe(
        (JSON.parse(r2.body) as RequestUploadResponse).uuid
      );
    });

    it("should work without a pre-existing submission", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { originalName: "standalone.pdf", fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Error cases", () => {
    it("should return 400 when originalName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { fileType: "SUBMISSION" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });

    it("should return 400 when fileType is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/files/request-upload",
        payload: { originalName: "file.pdf" },
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
        payload: { originalName: "file.pdf", fileType: "INVALID" },
      });

      expect(response.statusCode).toBe(400);
      expect((JSON.parse(response.body) as ApiErrorResponse).code).toBe(
        VALIDATION_ERROR_CODE
      );
    });
  });
});
