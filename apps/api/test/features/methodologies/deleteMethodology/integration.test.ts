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
import {
  createCarbonInventory,
  carbonInventoryPatterns,
} from "@test/factories/carbonInventorySeeder.js";
import type { DeleteMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("DELETE /api/methodologies/:id - Integration Tests", () => {
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
    // Clean up carbon inventories linked to test methodologies
    const testMethodologies = await prisma.methodologyVersion.findMany({
      where: { name: { startsWith: "Test - " } },
      select: { id: true },
    });

    if (testMethodologies.length > 0) {
      const testMethodologyIds = testMethodologies.map((m) => m.id);

      // Delete carbon inventory dependencies first
      await prisma.carbonInventoryLineResult.deleteMany({
        where: {
          lineInput: {
            line: {
              carbonInventory: {
                methodologyVersionId: { in: testMethodologyIds },
              },
            },
          },
        },
      });
      await prisma.carbonInventoryLineFactor.deleteMany({
        where: {
          lineInput: {
            line: {
              carbonInventory: {
                methodologyVersionId: { in: testMethodologyIds },
              },
            },
          },
        },
      });
      await prisma.carbonInventoryLineInput.deleteMany({
        where: {
          line: {
            carbonInventory: {
              methodologyVersionId: { in: testMethodologyIds },
            },
          },
        },
      });
      await prisma.carbonInventoryLine.deleteMany({
        where: {
          carbonInventory: {
            methodologyVersionId: { in: testMethodologyIds },
          },
        },
      });
      await prisma.carbonInventory.deleteMany({
        where: { methodologyVersionId: { in: testMethodologyIds } },
      });

      await prisma.methodologyVersion.deleteMany({
        where: { name: { startsWith: "Test - " } },
      });
    }
  });

  describe("Successful deletion", () => {
    it("should soft-delete an unpublished methodology and return 200", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - To Delete",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeleteMethodologyResponse;
      expect(body.message).toBe("Methodology deleted successfully");
      expect(body.id).toBe(methodology.id.toString());
    });

    it("should set status to DELETED in the database", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Verify DB Delete",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: methodology.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.DELETED);
    });

    it("should allow deletion when methodology has only DELETED carbon inventories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - With Deleted Inventories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.deleted(),
        methodologyVersionId: methodology.id,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when methodology does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/methodologies/999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });

    it("should return 404 when methodology is already deleted", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Already Deleted",
        status: MethodologyVersionStatus.DELETED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NOT_FOUND");
    });

    it("should return 409 when methodology is published", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Published Cannot Delete",
        status: MethodologyVersionStatus.PUBLISHED,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_IS_PUBLISHED");
    });

    it("should return 409 when methodology has active carbon inventories", async () => {
      const methodology = await createEmptyMethodologyVersion(prisma, {
        name: "Test - Has Active Inventories",
        status: MethodologyVersionStatus.UNPUBLISHED,
      });

      await createCarbonInventory(prisma, {
        ...carbonInventoryPatterns.simplifiedDraft(),
        methodologyVersionId: methodology.id,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/methodologies/${methodology.id}`,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_HAS_ACTIVE_INVENTORIES");
    });
  });
});
