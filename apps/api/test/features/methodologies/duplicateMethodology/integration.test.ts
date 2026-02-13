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
import { createEmptyMethodologyVersion } from "@test/factories/methodologyFactory.js";
import type { DuplicateMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/methodologies/:id/duplicate - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful duplication", () => {
    it("should duplicate a methodology and return 201", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Original",
        description: "Original description",
        regulation: "Original Regulation",
        version: "1.0",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.id).toBeTruthy();
      expect(body.id).not.toBe(original.id.toString());
      expect(body.name).toContain("(copy)");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should copy all fields from the original except status and name", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Fields",
        description: "Should be copied",
        regulation: "Should be copied too",
        version: "5.0",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      expect(body.description).toBe("Should be copied");
      expect(body.regulation).toBe("Should be copied too");
      expect(body.version).toBe("5.0");
      expect(body.status).toBe("UNPUBLISHED");
    });

    it("should persist the duplicated methodology in the database", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - DB Verify Duplicate",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as DuplicateMethodologyResponse;

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.UNPUBLISHED);
    });

    it("should append additional (copy) if name with (copy) already exists", async () => {
      const original = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Copy Naming",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      // First duplicate
      const firstDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(firstDuplicateResponse.statusCode).toBe(201);

      // Second duplicate - should get "(copy) (copy)"
      const secondDuplicateResponse = await app.inject({
        method: "POST",
        url: `/api/methodologies/${original.id}/duplicate`,
      });
      expect(secondDuplicateResponse.statusCode).toBe(201);

      const secondBody = JSON.parse(
        secondDuplicateResponse.body
      ) as DuplicateMethodologyResponse;

      // The name should contain two "(copy)" suffixes
      expect(secondBody.name).toContain("(copy) (copy)");
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const maxId =
        (await prisma.methodologyVersion.aggregate({ _max: { id: true } }))._max
          .id ?? 0n;
      const nonExistentId = maxId + 1n;

      const response = await app.inject({
        method: "POST",
        url: `/api/methodologies/${nonExistentId}/duplicate`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });
  });
});
