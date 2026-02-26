import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestFileForBadge,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { BadgeType, BadgeStatus, FileStatus } from "@repo/database";
import type { GetBadgeFilesResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

describe("GET /api/files/badge/:badgeType - Integration Tests", () => {
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

  beforeEach(async () => {
    await cleanupTestFiles(prisma);
  });

  describe("Happy path", () => {
    it("should return an empty array when no active badges exist for the type", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it("should return active badge files for the given badge type", async () => {
      const { file } = await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetBadgeFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(file.uuid);
      expect(body[0].originalName).toBe(file.originalName);
      expect(body[0].mimeType).toBe(file.mimeType);
      expect(body[0].status).toBe(FileStatus.ACTIVE);
    });

    it("should not return badges from other badge types", async () => {
      await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.ORGANIZATION_DATA
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(0);
    });
  });

  describe("Badge status filtering (ACTIVE only)", () => {
    it("should not return files for INACTIVE badges", async () => {
      await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY,
        { badgeOverrides: { status: BadgeStatus.INACTIVE } }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(0);
    });

    it("should return only the ACTIVE badge file when both ACTIVE and INACTIVE badges exist", async () => {
      const { file: activeFile } = await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY,
        { badgeOverrides: { status: BadgeStatus.ACTIVE } }
      );
      await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY,
        { badgeOverrides: { status: BadgeStatus.INACTIVE } }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetBadgeFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(activeFile.uuid);
    });
  });

  describe("Filter by file status", () => {
    it("should return only ACTIVE files by default", async () => {
      await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY,
        { fileOverrides: { status: FileStatus.DELETED } }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(0);
    });

    it("should return DELETED files when status=DELETED is requested", async () => {
      const { file: deletedFile } = await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.CARBON_INVENTORY,
        { fileOverrides: { status: FileStatus.DELETED } }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}?status=DELETED`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetBadgeFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(deletedFile.uuid);
    });
  });

  describe("Error cases", () => {
    it("should return 400 for an invalid badge type", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/INVALID_TYPE`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 for an invalid status query parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/badge/${BadgeType.CARBON_INVENTORY}?status=INVALID`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
