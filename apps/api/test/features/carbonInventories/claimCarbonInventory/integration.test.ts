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
import { cleanupCarbonInventoryTestData } from "@test/factories/carbonInventorySeeder.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("POST /api/carbon-inventories/:id/claim - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  let methodologyVersionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    methodologyVersionId = await getTestMethodologyVersionId(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  async function createAnonymousInventory() {
    return prisma.carbonInventory.create({
      data: {
        usageMode: "SIMPLIFIED",
        createdById: null,
        methodologyVersionId,
      },
    });
  }

  describe("Successful claim", () => {
    it("should return 200 with null body when inventory is anonymous and UUID matches", async () => {
      const inventory = await createAnonymousInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: { "x-carbon-inventory-uuid": inventory.uuid },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toBeNull();
    });

    it("should set createdById to the authenticated user after claiming", async () => {
      const inventory = await createAnonymousInventory();
      const user = await getTestLoggedUser(prisma);

      await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: { "x-carbon-inventory-uuid": inventory.uuid },
      });

      const updated = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(updated?.createdById).toBe(BigInt(user.id));
    });
  });

  describe("Invalid UUID header (400)", () => {
    it("should return 400 when x-carbon-inventory-uuid header is missing", async () => {
      const inventory = await createAnonymousInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_INVALID_UUID");
    });
  });

  describe("Not found (404)", () => {
    it("should return 404 for a non-existent inventory ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999999/claim`,
        headers: {
          "x-carbon-inventory-uuid": "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 404 when UUID does not match (same response as non-existent to prevent ID enumeration)", async () => {
      const inventory = await createAnonymousInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: {
          "x-carbon-inventory-uuid": "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 404 when inventory is already claimed by a user", async () => {
      const user = await getTestLoggedUser(prisma);
      const inventory = await prisma.carbonInventory.create({
        data: {
          usageMode: "SIMPLIFIED",
          createdById: BigInt(user.id),
          methodologyVersionId,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: { "x-carbon-inventory-uuid": inventory.uuid },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 404 when inventory already belongs to an organization", async () => {
      const org = await createTestOrganization(prisma);

      const inventory = await prisma.carbonInventory.create({
        data: {
          usageMode: "SIMPLIFIED",
          createdById: null,
          organizationId: org.id,
          methodologyVersionId,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: { "x-carbon-inventory-uuid": inventory.uuid },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 404 when inventory status is DELETED", async () => {
      const inventory = await prisma.carbonInventory.create({
        data: {
          usageMode: "SIMPLIFIED",
          createdById: null,
          status: "DELETED",
          methodologyVersionId,
        },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/claim`,
        headers: { "x-carbon-inventory-uuid": inventory.uuid },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });
  });

  describe("Param validation (400)", () => {
    it("should return 400 when id is not a valid numeric string", async () => {
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/not-a-number/claim`,
        headers: {
          "x-carbon-inventory-uuid": "00000000-0000-0000-0000-000000000000",
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
