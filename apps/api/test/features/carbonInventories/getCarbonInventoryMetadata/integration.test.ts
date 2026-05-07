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
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestMemberships,
  createTestMembership,
} from "@test/factories/membershipFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestCarbonInventorySubmission } from "@test/factories/submissionFactory.js";
import type { GetCarbonInventoryMetadataResponse } from "@repo/types";
import { CarbonInventoryDisplayStatusEnum } from "@repo/types";
import {
  OrganizationRole,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/carbon-inventories/:id/metadata - Integration Tests", () => {
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
    await prisma.submission.deleteMany({});
    await prisma.submissionSubjectCarbonInventory.deleteMany({});
    await prisma.submissionSubject.deleteMany({});
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Successful retrieval", () => {
    it("returns metadata for a standalone draft inventory created by the user", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { createdById: testUser.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/metadata`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMetadataResponse;
      expect(body.id).toBe(inventory.id.toString());
      expect(body.status).toBe(CarbonInventoryDisplayStatusEnum.DRAFT);
      expect(body).not.toHaveProperty("canEdit");
    });

    it("returns the organization summary name when the inventory belongs to an org", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.CONTRIBUTOR,
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: testUser.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/metadata`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMetadataResponse;
      expect(body.id).toBe(inventory.id.toString());
      expect(body.status).toBe(CarbonInventoryDisplayStatusEnum.DRAFT);
    });

    it("derives status from approved verification submissions", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const organization = await createTestOrganization(prisma);
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.CONTRIBUTOR,
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: organization.id, createdById: testUser.id }
      );
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_VERIFICATION,
        SubmissionStatus.APPROVED,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/metadata`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryMetadataResponse;
      expect(body.status).toBe(
        CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED
      );
    });
  });

  describe("Errors", () => {
    it("returns 403 for a non-existent inventory id (prevent enumeration)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/9999999999/metadata",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 400 for an invalid id format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/not-a-number/metadata",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
