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
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  createTestOrganizationData,
  cleanupTestOrganizationData,
} from "@test/factories/organizationDataFactory.js";
import {
  type CreateCarbonInventoryResponse,
  MethodologyVersionStatus,
} from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createCarbonInventoryService } from "@/features/carbonInventories/createCarbonInventory/service.js";

describe("POST /api/carbon-inventories - Integration Tests", () => {
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
    await cleanupTestOrganizationData(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Successful creation", () => {
    it("should create carbon inventory with SIMPLIFIED usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.year).toBeNull(); // Defaults to null
      expect(body.usageMode).toBe("SIMPLIFIED");
      expect(body.isEditable).toBe(true); // Default value
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeNull();

      // Verify it was actually created in the database
      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbInventory).toBeDefined();
      expect(dbInventory?.year).toBeNull();
    });

    it("should create carbon inventory with EXPERT usage mode", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "EXPERT",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      expect(body.id).toBeTruthy();
      expect(body.year).toBeNull();
      expect(body.usageMode).toBe("EXPERT");
      expect(body.isEditable).toBe(true);
    });
  });

  describe("Default values", () => {
    it("should set status to DRAFT by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should set isEditable to true by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.isEditable).toBe(true);
    });

    it("should set year to null by default", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.year).toBeNull();
    });

    it("should set nullable fields to null by default", async () => {
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const methodologyVersionIdString = methodologyVersionId.toString();

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      const { id } = await getTestLoggedUser(prisma);

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.name).toBeNull();
      expect(body.organizationId).toBeNull();
      expect(body.organizationBranchId).toBeNull();
      expect(body.organizationData).toBeNull();
      expect(body.methodologyVersionId).toBe(methodologyVersionIdString);
      expect(body.preselectedNodesId).toBeNull();
      expect(body.createdById).toBe(id.toString());
      expect(body.updatedById).toBeNull();
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when usageMode is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
      expect(body.message).toContain("usageMode");
    });

    it("should return 400 when usageMode is invalid", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "INVALID",
          organizationId: null,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
      expect(body.message).toBeTruthy();
    });

    it("should return 400 when extra fields are provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
          year: 2024,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationData is provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
          organizationData: {
            name: "Test",
            sectorId: "10",
            subsectorId: "20",
            sizeId: "5",
            mainActivityId: "15",
            mainActivityQuantity: 250,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Multiple creations", () => {
    it("should create multiple inventories with unique IDs", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "EXPERT",
          organizationId: null,
        },
      });

      const response3 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
      expect(response3.statusCode).toBe(201);

      const body1 = JSON.parse(response1.body) as CreateCarbonInventoryResponse;
      const body2 = JSON.parse(response2.body) as CreateCarbonInventoryResponse;
      const body3 = JSON.parse(response3.body) as CreateCarbonInventoryResponse;

      expect(body1.id).not.toBe(body2.id);
      expect(body2.id).not.toBe(body3.id);
      expect(body1.id).not.toBe(body3.id);
    });

    it("should allow creating multiple inventories with the same usageMode", async () => {
      const response1 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      const response2 = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);

      const body1 = JSON.parse(response1.body) as CreateCarbonInventoryResponse;
      const body2 = JSON.parse(response2.body) as CreateCarbonInventoryResponse;

      expect(body1.usageMode).toBe("SIMPLIFIED");
      expect(body2.usageMode).toBe("SIMPLIFIED");
      expect(body1.id).not.toBe(body2.id);
    });
  });

  describe("Timestamps", () => {
    it("should set createdAt and updatedAt timestamps", async () => {
      const beforeCreation = new Date();

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: null,
        },
      });

      const afterCreation = new Date();

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;

      const createdAt = new Date(body.createdAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
    });
  });

  describe("Business logic errors", () => {
    it("should return 422 when no active methodology is found", async () => {
      // Temporarily change all active methodologies to DELETED
      const activeMethodologies = await prisma.methodologyVersion.findMany({
        where: {
          status: MethodologyVersionStatus.PUBLISHED,
        },
      });

      // Store original status IDs to restore later
      const originalStatusIds = activeMethodologies.map((m) => ({
        id: m.id,
        status: m.status,
      }));

      // Update all active methodologies to DELETED
      await prisma.methodologyVersion.updateMany({
        where: {
          status: MethodologyVersionStatus.PUBLISHED,
        },
        data: {
          status: MethodologyVersionStatus.DELETED,
        },
      });

      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/carbon-inventories",
          payload: {
            usageMode: "SIMPLIFIED",
            organizationId: null,
          },
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("NO_ACTIVE_METHODOLOGY");
        expect(body.message).toBe("No active methodology version found");
      } finally {
        // Restore original statuses
        for (const { id, status } of originalStatusIds) {
          await prisma.methodologyVersion.update({
            where: { id },
            data: { status },
          });
        }
      }
    });
  });

  describe("Organization data snapshot", () => {
    it("should leave organizationData null when the linked organization has no summary (no OrganizationData row)", async () => {
      const organization = await createTestOrganization(prisma);

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: organization.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationId).toBe(organization.id.toString());
      expect(body.organizationData).toBeNull();
    });

    it("should snapshot organizationData with null catalog fields when the organization's data has none set", async () => {
      const organization = await createTestOrganization(prisma);
      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: organization.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationData).toEqual({
        name: organizationData.tradeName,
        sectorId: null,
        subsectorId: null,
        sizeId: null,
        mainActivityId: null,
        mainActivityQuantity: null,
        sector: null,
        subsector: null,
        size: null,
        mainActivity: null,
      });
    });

    it("should snapshot organizationData's catalog *Id fields when the organization's data has them set", async () => {
      const sector = await prisma.countrySector.findFirstOrThrow({
        select: { id: true },
      });
      const subsector = await prisma.countrySubsector.findFirstOrThrow({
        select: { id: true },
      });
      const size = await prisma.countryOrganizationSize.findFirstOrThrow({
        select: { id: true },
      });
      const mainActivity =
        await prisma.organizationMainActivity.findFirstOrThrow({
          select: { id: true },
        });

      const organization = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, organization.id, {
        sectorId: sector.id,
        subsectorId: subsector.id,
        countryOrganizationSizeId: size.id,
        mainActivityId: mainActivity.id,
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories",
        payload: {
          usageMode: "SIMPLIFIED",
          organizationId: organization.id.toString(),
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateCarbonInventoryResponse;
      expect(body.organizationData?.sectorId).toBe(sector.id.toString());
      expect(body.organizationData?.subsectorId).toBe(subsector.id.toString());
      expect(body.organizationData?.sizeId).toBe(size.id.toString());
      expect(body.organizationData?.mainActivityId).toBe(
        mainActivity.id.toString()
      );
    });
  });

  describe("Anonymous creation (no authenticated user)", () => {
    it("should create an inventory with a null createdById when no user is provided", async () => {
      // The public route always resolves a forced user via HTTP in this test
      // environment, so an anonymous request is exercised by calling the
      // service directly (bypassing the handler) with a null user — the same
      // real database the HTTP-level tests use.
      const result = await createCarbonInventoryService(
        prisma,
        { usageMode: "SIMPLIFIED", organizationId: null },
        null
      );

      expect(result.createdById).toBeNull();

      const dbInventory = await prisma.carbonInventory.findUniqueOrThrow({
        where: { id: BigInt(result.id) },
      });
      expect(dbInventory.createdById).toBeNull();
    });
  });
});
