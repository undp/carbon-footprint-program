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
import {
  createTestMembership,
  cleanupTestMemberships,
} from "@test/factories/membershipFactory.js";
import {
  createTestUser,
  cleanupTestUsers,
  getTestLoggedUser,
} from "@test/factories/userFactory.js";
import {
  createTestCarbonInventorySubmission,
  cleanupTestSubmissions,
} from "@test/factories/submissionFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("POST /api/carbon-inventories/:id/assign-organization/:organizationId - Integration Tests", () => {
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
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
    await cleanupTestUsers(prisma);
  });

  async function createDraftInventory(overrides?: {
    year?: number | null;
    createdById?: bigint | null;
    organizationId?: bigint | null;
  }) {
    const loggedUser = await getTestLoggedUser(prisma);
    return prisma.carbonInventory.create({
      data: {
        usageMode: "SIMPLIFIED",
        methodologyVersionId,
        createdById:
          overrides?.createdById !== undefined
            ? overrides.createdById
            : BigInt(loggedUser.id),
        organizationId: overrides?.organizationId ?? null,
        year: overrides?.year ?? 2024,
      },
    });
  }

  describe("Success (200)", () => {
    it("assigns an organization to a draft when the user is an ADMIN member", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id,
        { role: OrganizationRole.ADMIN }
      );
      const inventory = await createDraftInventory({ year: 2024 });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toBeNull();

      const updated = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(updated?.organizationId).toBe(organization.id);
      expect(updated?.updatedById).toBe(BigInt(loggedUser.id));
    });

    it("assigns an organization to a draft with year=null", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id,
        { role: OrganizationRole.CONTRIBUTOR }
      );
      const inventory = await createDraftInventory({ year: null });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(200);
      const updated = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(updated?.organizationId).toBe(organization.id);
    });
  });

  describe("Not found (404)", () => {
    it("returns 403 for a non-existent inventory id (auth masks 404 to prevent enumeration)", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/999999999/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Forbidden (403)", () => {
    it("returns 403 when the logged user is not the creator of the standalone draft", async () => {
      const otherUser = await createTestUser(prisma);
      const organization = await createTestOrganization(prisma);
      const loggedUser = await getTestLoggedUser(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id
      );
      const inventory = await createDraftInventory({
        createdById: BigInt(otherUser.id),
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(403);
    });

    it("returns 403 when the user is not an active member of the target organization", async () => {
      const organization = await createTestOrganization(prisma);
      const inventory = await createDraftInventory({ year: 2024 });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 403 when the user's role is VIEWER (insufficient role)", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id,
        { role: OrganizationRole.VIEWER }
      );
      const inventory = await createDraftInventory({ year: 2024 });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Rule 3: inventory must be editable", () => {
    it("returns 403 when the inventory is not editable (has a pending calculation submission)", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id,
        { role: OrganizationRole.ADMIN }
      );
      const inventory = await createDraftInventory();
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        BigInt(loggedUser.id)
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_EDITABLE");
    });
  });

  describe("Unprocessable entity (422)", () => {
    it("returns 422 when the inventory already has an organization", async () => {
      const loggedUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(
        prisma,
        BigInt(loggedUser.id),
        organization.id
      );
      const inventory = await createDraftInventory({
        organizationId: organization.id,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/${organization.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_ALREADY_HAS_ORGANIZATION");
    });
  });

  describe("Validation (400)", () => {
    it("returns 400 when organizationId is not a valid numeric string", async () => {
      const inventory = await createDraftInventory();
      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/assign-organization/not-a-number`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
