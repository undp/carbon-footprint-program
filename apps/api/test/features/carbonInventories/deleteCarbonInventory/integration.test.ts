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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  InventoryStatus,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import { type ApiErrorResponse } from "@/commonSchemas/errors.js";
import { createCarbonInventorySubmission } from "@/features/carbonInventories/helpers.js";

describe("DELETE /api/carbon-inventories/:id - Integration Tests", () => {
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

  describe("Successful deletion", () => {
    it("should return 200 and soft-delete a DRAFT carbon inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.status).toBe(InventoryStatus.DELETED);
    });

    it("should set updatedById to the current user", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.updatedById).toBe(user.id);
    });

    it("should soft-delete an EXPERT draft inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.expertDraft
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.status).toBe(InventoryStatus.DELETED);
    });
  });

  describe("Not found errors", () => {
    it("should return 404 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/carbon-inventories/999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });
  });

  describe("Not deletable errors", () => {
    it("should return 404 when inventory has a pending calculation submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_DELETABLE");
    });

    it("should return 404 when inventory has an approved calculation submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const submissionId = await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );

      await prisma.submission.update({
        where: { id: submissionId },
        data: { status: SubmissionStatus.APPROVED },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_DELETABLE");
    });

    it("should return 404 when inventory has a pending verification submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      // Create approved calculation first
      const calcSubmissionId = await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );
      await prisma.submission.update({
        where: { id: calcSubmissionId },
        data: { status: SubmissionStatus.APPROVED },
      });

      // Create pending verification
      await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        user.id
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_DELETABLE");
    });

    it("should return 404 when inventory has an approved verification submission", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const calcSubmissionId = await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );
      await prisma.submission.update({
        where: { id: calcSubmissionId },
        data: { status: SubmissionStatus.APPROVED },
      });

      const verifSubmissionId = await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        user.id
      );
      await prisma.submission.update({
        where: { id: verifSubmissionId },
        data: { status: SubmissionStatus.APPROVED },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_DELETABLE");
    });

    it("should not modify the inventory when deletion is rejected", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );

      await app.inject({
        method: "DELETE",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.status).not.toBe(InventoryStatus.DELETED);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for an invalid id format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/carbon-inventories/not-a-number",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
