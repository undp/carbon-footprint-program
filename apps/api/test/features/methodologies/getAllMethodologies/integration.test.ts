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
import type { GetAllMethodologiesResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("GET /api/methodologies - Integration Tests", () => {
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
    // Clean up test-created methodologies, keep seeded data
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful retrieval", () => {
    it("should return methodologies with country data and counts", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/methodologies",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMethodologiesResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);

      const methodology = body[0];
      expect(methodology.id).toBeTruthy();
      expect(methodology.name).toBeTruthy();
      expect(methodology.country).toBeDefined();
      expect(methodology.country!.id).toBeTruthy();
      expect(methodology.country!.name).toBeTruthy();
      expect(methodology.country!.isoCode).toBeTruthy();
      expect(typeof methodology.categoryCount).toBe("number");
      expect(typeof methodology.carbonInventoryCount).toBe("number");
    });

    it("should not return deleted methodologies", async () => {
      await createEmptyMethodologyVersion(prisma, {
        name: "Test - Deleted Methodology",
        status: MethodologyVersionStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/methodologies",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMethodologiesResponse;

      const deletedMethodology = body.find((m) =>
        m.name.includes("Test - Deleted Methodology")
      );
      expect(deletedMethodology).toBeUndefined();
    });

    it("should return methodologies ordered by createdAt desc", async () => {
      await createEmptyMethodologyVersion(prisma, {
        name: "Test - Older Methodology",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createEmptyMethodologyVersion(prisma, {
        name: "Test - Newer Methodology",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/methodologies",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMethodologiesResponse;

      // Find the two test methodologies
      const newerIndex = body.findIndex((m) =>
        m.name.includes("Test - Newer Methodology")
      );
      const olderIndex = body.findIndex((m) =>
        m.name.includes("Test - Older Methodology")
      );

      expect(newerIndex).toBeLessThan(olderIndex);
    });

    it("should include both PUBLISHED and UNPUBLISHED methodologies", async () => {
      await createEmptyMethodologyVersion(prisma, {
        name: "Test - Published Methodology",
        status: MethodologyVersionStatus.PUBLISHED,
      });
      await createEmptyMethodologyVersion(prisma, {
        name: "Test - Unpublished Methodology",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/methodologies",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllMethodologiesResponse;

      const statuses = new Set(body.map((m) => m.status));
      expect(statuses.has(MethodologyVersionStatus.PUBLISHED)).toBe(true);
      expect(statuses.has(MethodologyVersionStatus.UNPUBLISHED)).toBe(true);
      expect(statuses.has(MethodologyVersionStatus.DELETED)).toBe(false);
    });
  });
});
