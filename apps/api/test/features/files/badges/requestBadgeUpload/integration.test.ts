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
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { BadgeType } from "@repo/database";
import type { RequestBadgeUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

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

describe("POST /api/files/badge/:badgeType/request-upload - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"), {
      storageConnectionString: inject("storageConnectionString"),
      storageContainerName: inject("storageContainerName"),
    });
    prisma = app.prisma;
    await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestFiles(prisma);
  });

  describe("Happy path", () => {
    it("should return 200 with uuid, uploadUrl and expiresAt for CARBON_INVENTORY", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}/request-upload`,
        payload: { originalName: "badge.png" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as RequestBadgeUploadResponse;
      expect(body.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(body.uploadUrl).toBeTruthy();
      expect(body.expiresAt).toBeTruthy();
    });

    it("should return 200 for ORGANIZATION_DATA badge type", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.ORGANIZATION_DATA}/request-upload`,
        payload: { originalName: "org-badge.png" },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should generate a different uuid on each call", async () => {
      const payload = { originalName: "badge.png" };

      const r1 = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}/request-upload`,
        payload,
      });
      const r2 = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}/request-upload`,
        payload,
      });

      expect((JSON.parse(r1.body) as RequestBadgeUploadResponse).uuid).not.toBe(
        (JSON.parse(r2.body) as RequestBadgeUploadResponse).uuid
      );
    });
  });

  describe("Error cases", () => {
    it("should return 400 when badgeType is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/INVALID_TYPE/request-upload`,
        payload: { originalName: "badge.png" },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 when originalName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}/request-upload`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });

});
