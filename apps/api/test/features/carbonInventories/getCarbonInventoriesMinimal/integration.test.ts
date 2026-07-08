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
import {
  createInventoryFromPattern,
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";
import { cleanupTestSubmissions } from "@test/factories/submissionFactory.js";
import type { FastifyInstance } from "fastify";
import { type PrismaClient, InventoryStatus } from "@repo/database";
import type { GetCarbonInventoriesMinimalResponse } from "@repo/types";

describe("GET /api/carbon-inventories/minimal - Integration Tests", () => {
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

  afterEach(async () => {
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
  });

  describe("Basic shape", () => {
    it("should return an empty array when no carbon inventories exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoriesMinimalResponse;
      expect(body).toEqual([]);
    });

    it("should return id, organizationId, organizationName, name, year, status and isSelfDeclared", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2024, name: "Inventory Minimal" }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoriesMinimalResponse;

      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: inventory.id.toString(),
        organizationId: null,
        organizationName: null,
        name: "Inventory Minimal",
        year: 2024,
        status: "DRAFT",
        isSelfDeclared: false,
      });
    });
  });

  describe("isSelfDeclared field", () => {
    it("should return isSelfDeclared=true for a self-declared inventory and isSelfDeclared=false for a plain draft", async () => {
      const selfDeclaredInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { isSelfDeclared: true, year: 2024 }
      );
      const draftInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2023 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoriesMinimalResponse;

      expect(body).toHaveLength(2);

      const selfDeclaredResponse = body.find(
        (inv) => inv.id === selfDeclaredInventory.id.toString()
      );
      const draftResponse = body.find(
        (inv) => inv.id === draftInventory.id.toString()
      );

      expect(selfDeclaredResponse?.isSelfDeclared).toBe(true);
      expect(selfDeclaredResponse?.status).toBe("SELF_DECLARED");
      expect(draftResponse?.isSelfDeclared).toBe(false);
      expect(draftResponse?.status).toBe("DRAFT");
    });
  });

  describe("Soft-deleted inventories", () => {
    it("should exclude inventories with a non-ACTIVE status", async () => {
      const activeInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2024 }
      );
      await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2024, status: InventoryStatus.DELETED }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/minimal",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoriesMinimalResponse;

      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(activeInventory.id.toString());
    });
  });
});
