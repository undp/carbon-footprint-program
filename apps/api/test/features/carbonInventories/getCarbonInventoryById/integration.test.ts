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
  buildExpectedOrganizationData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
  cleanupCarbonInventoryTestData,
  createCarbonInventoryLine,
  getSubcategoryIds,
} from "@test/factories/carbonInventorySeeder.js";
import {
  type GetCarbonInventoryByIdResponse,
  CarbonInventoryDisplayStatusEnum,
  CarbonInventoryLineStatus,
} from "@repo/types";
import { SystemRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import { getCarbonInventoryByIdService } from "@/features/carbonInventories/getCarbonInventoryById/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestMemberships,
  createTestMembership,
} from "@test/factories/membershipFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/carbon-inventories/:id - Integration Tests", () => {
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
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return a carbon inventory by valid ID", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.id).toBe(testInventory.id.toString());
      expect(body.year).toBeNull();
      expect(body.status).toBe(CarbonInventoryDisplayStatusEnum.DRAFT);
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.isEditable).toBe(true);
    });

    it("should return complete data including all nullable fields when populated", async () => {
      const { id: userId } = await getTestLoggedUser(prisma);
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      // Get a seeded organization to satisfy foreign key constraint
      const organization = await createTestOrganization(prisma);
      const organizationId = organization.id;

      await createTestMembership(prisma, userId, organizationId);

      const testInventory = await createInventoryFromPattern(prisma, () =>
        carbonInventoryPatterns.complete(
          organizationId,
          BigInt(456),
          BigInt(methodologyVersionId),
          BigInt(111),
          userId
        )
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        {
          name: "Test Organization",
          sectorId: "10",
          subsectorId: "20",
          sizeId: "5",
          mainActivityId: "15",
          mainActivityQuantity: 250,
        }
      );
      expect(body.id).toBe(testInventory.id.toString());
      expect(body.organizationId).toBe(organizationId.toString());
      expect(body.organizationBranchId).toBe("456");
      expect(body.organizationData).toEqual(expectedOrganizationData);
      expect(body.year).toBe(2023);
      expect(body.usageMode).toBe("EXPERT");
      expect(body.methodologyVersionId).toBe(methodologyVersionId.toString());
      expect(body.preselectedNodesId).toBe("111");
      expect(body.isEditable).toBe(false);
      expect(body.createdById).toBe(userId.toString());
      expect(body.updatedById).toBeNull();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeNull();
    });

    it("should return null for nullable fields when not populated", async () => {
      const testInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);

      const { id: userId } = await getTestLoggedUser(prisma);

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${testInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
      expect(body.methodologyVersionId).toBe(methodologyVersionId.toString());
      expect(body.preselectedNodesId).toBeNull();
      expect(body.createdById).toBe(userId.toString());
      expect(body.updatedById).toBeNull();
    });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for non-existent ID", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (decimal)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/123.45",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (negative)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/-123",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        getCarbonInventoryByIdService(prisma, "999999999")
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });
  });

  describe("Different usage modes", () => {
    it("should retrieve inventory with SIMPLIFIED mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.usageMode).toBe("SIMPLIFIED");
    });

    it("should retrieve inventory with EXPERT mode", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.expertDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.usageMode).toBe("EXPERT");
    });
  });

  describe("Organization data validation", () => {
    it("should correctly return valid organization data", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.withOrganizationData
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      const expectedOrganizationData = await buildExpectedOrganizationData(
        prisma,
        {
          name: "Acme Corp",
          sectorId: "5",
          subsectorId: "12",
          sizeId: "3",
          mainActivityId: "8",
          mainActivityQuantity: 500,
        }
      );
      expect(body.organizationData).toEqual(expectedOrganizationData);
    });
  });

  describe("Year validation", () => {
    it("should retrieve inventory with valid year", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2022 }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.year).toBe(2022);
      expect(body.year).toBeGreaterThanOrEqual(2000);
      expect(body.year).toBeLessThanOrEqual(2100);
    });
  });

  describe("Admin bypass", () => {
    it("allows ADMIN system role to read inventory of an organization without membership", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const originalRole = testUser.role;
      const otherCreator = await prisma.user.create({
        data: {
          email: `creator-${Date.now()}@test.example.com`,
          idpUserId: `test-idp-creator-${Date.now()}`,
          firstName: "Other",
          lastName: "Creator",
        },
      });
      const organization = await createTestOrganization(prisma);

      try {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: SystemRole.ADMIN },
        });

        const inventory = await createInventoryFromPattern(
          prisma,
          carbonInventoryPatterns.simplifiedDraft,
          {
            organizationId: organization.id,
            createdById: otherCreator.id,
          }
        );

        const response = await app.inject({
          method: "GET",
          url: `/api/carbon-inventories/${inventory.id}`,
        });

        expect(response.statusCode).toBe(200);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: originalRole },
        });
        await prisma.user.delete({ where: { id: otherCreator.id } });
      }
    });

    it("returns 403 for a regular USER with no membership and not the creator", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const originalRole = testUser.role;
      const otherCreator = await prisma.user.create({
        data: {
          email: `creator-${Date.now()}@test.example.com`,
          idpUserId: `test-idp-creator-${Date.now()}`,
          firstName: "Other",
          lastName: "Creator",
        },
      });
      const organization = await createTestOrganization(prisma);

      try {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: SystemRole.USER },
        });

        const inventory = await createInventoryFromPattern(
          prisma,
          carbonInventoryPatterns.simplifiedDraft,
          {
            organizationId: organization.id,
            createdById: otherCreator.id,
          }
        );

        const response = await app.inject({
          method: "GET",
          url: `/api/carbon-inventories/${inventory.id}`,
        });

        expect(response.statusCode).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: originalRole },
        });
        await prisma.user.delete({ where: { id: otherCreator.id } });
      }
    });
  });

  describe("Editability", () => {
    it("should retrieve editable inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should retrieve non-editable inventory", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { isEditable: false }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;
      expect(body.isEditable).toBe(false);
    });
  });

  describe("Line filtering by status", () => {
    it("should only return ACTIVE lines and exclude DELETED lines", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(2);

      // Create ACTIVE lines
      const activeLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );

      // Create DELETED lines
      const deletedLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.DELETED }
      );
      const deletedLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.DELETED }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify only ACTIVE lines are returned, grouped by subcategoryId
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      const returnedLineIds = allLines.map((line) => line.id);
      expect(returnedLineIds).toContain(activeLine1.id.toString());
      expect(returnedLineIds).toContain(activeLine2.id.toString());
      expect(returnedLineIds).not.toContain(deletedLine1.id.toString());
      expect(returnedLineIds).not.toContain(deletedLine2.id.toString());
      expect(allLines.length).toBe(2);

      // Verify lines are grouped by subcategoryId
      expect(body.subcategories.length).toBe(2);
      const subcategory1 = body.subcategories.find(
        (subcat) => subcat.id === subcategoryIds[0].toString()
      );
      const subcategory2 = body.subcategories.find(
        (subcat) => subcat.id === subcategoryIds[1].toString()
      );
      expect(subcategory1).toBeDefined();
      expect(subcategory2).toBeDefined();
      expect(subcategory1?.lines.length).toBe(1);
      expect(subcategory2?.lines.length).toBe(1);
    });

    it("should return empty lines array when all lines are DELETED", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThan(0);

      // Create only DELETED lines
      await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.DELETED }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify no lines are returned (no subcategories when all lines are deleted)
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      expect(allLines).toEqual([]);
      expect(allLines.length).toBe(0);
      expect(body.subcategories.length).toBe(0);
    });

    it("should return all ACTIVE lines when no DELETED lines exist", async () => {
      const methodologyId = await getTestMethodologyVersionId(prisma);
      const carbonInventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { methodologyVersionId: methodologyId }
      );

      const subcategoryIds = await getSubcategoryIds(prisma, methodologyId);
      expect(subcategoryIds.length).toBeGreaterThanOrEqual(3);

      // Create multiple ACTIVE lines
      const activeLine1 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[0],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine2 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[1],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );
      const activeLine3 = await createCarbonInventoryLine(
        prisma,
        carbonInventory.id,
        subcategoryIds[2],
        { status: CarbonInventoryLineStatus.ACTIVE }
      );

      // Fetch the inventory
      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${carbonInventory.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetCarbonInventoryByIdResponse;

      // Verify all ACTIVE lines are returned, grouped by subcategoryId
      const allLines = body.subcategories.flatMap((subcat) => subcat.lines);
      expect(allLines.length).toBe(3);
      const returnedLineIds = allLines.map((line) => line.id);
      expect(returnedLineIds).toContain(activeLine1.id.toString());
      expect(returnedLineIds).toContain(activeLine2.id.toString());
      expect(returnedLineIds).toContain(activeLine3.id.toString());

      // Verify lines are grouped by subcategoryId
      expect(body.subcategories.length).toBe(3);
      body.subcategories.forEach((subcat) => {
        expect(subcat.lines.length).toBe(1);
        expect(subcat.id).toBeTruthy();
        expect(subcat.isTotalManualEmissionsModeActive).toBe(false);
      });
    });
  });
});
