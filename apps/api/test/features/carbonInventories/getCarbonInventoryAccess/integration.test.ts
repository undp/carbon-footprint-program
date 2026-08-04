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
import type { GetCarbonInventoryAccessResponse } from "@repo/types";
import {
  OrganizationRole,
  SubmissionStatus,
  SubmissionType,
  SystemRole,
} from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { getCarbonInventoryAccessService } from "@/features/carbonInventories/getCarbonInventoryAccess/service.js";
import { CarbonInventoryNotFoundError } from "@/features/carbonInventories/errors.js";

describe("GET /api/carbon-inventories/:id/access - Integration Tests", () => {
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

  it("returns canEdit=true for a CONTRIBUTOR member on a draft inventory", async () => {
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
      url: `/api/carbon-inventories/${inventory.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCarbonInventoryAccessResponse;
    expect(body.canEdit).toBe(true);
    expect(body.membership).toEqual({ role: OrganizationRole.CONTRIBUTOR });
  });

  it("returns canEdit=false for a VIEWER member on a draft inventory", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const organization = await createTestOrganization(prisma);
    await createTestMembership(prisma, testUser.id, organization.id, {
      role: OrganizationRole.VIEWER,
    });
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { organizationId: organization.id, createdById: testUser.id }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCarbonInventoryAccessResponse;
    expect(body.canEdit).toBe(false);
    expect(body.membership).toEqual({ role: OrganizationRole.VIEWER });
  });

  it("returns canEdit=false for an ADMIN system role with no membership (org inventory)", async () => {
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
        { organizationId: organization.id, createdById: otherCreator.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/access`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryAccessResponse;
      expect(body.canEdit).toBe(false);
      expect(body.membership).toBeNull();
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("returns canEdit=false for an ADMIN viewing another user's standalone inventory", async () => {
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

    try {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { createdById: otherCreator.id }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/carbon-inventories/${inventory.id}/access`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetCarbonInventoryAccessResponse;
      expect(body.canEdit).toBe(false);
      expect(body.membership).toBeNull();
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
      await prisma.user.delete({ where: { id: otherCreator.id } });
    }
  });

  it("returns canEdit=true for the creator of a standalone inventory", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { createdById: testUser.id }
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCarbonInventoryAccessResponse;
    expect(body.canEdit).toBe(true);
    expect(body.membership).toBeNull();
  });

  it("returns canEdit=false for a CONTRIBUTOR when status is non-editable", async () => {
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
    // Approved verification submission moves the inventory to
    // VERIFICATION_APPROVED, which is not in EDITABLE_STATUSES.
    await createTestCarbonInventorySubmission(
      prisma,
      inventory.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      SubmissionStatus.APPROVED,
      testUser.id
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/carbon-inventories/${inventory.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetCarbonInventoryAccessResponse;
    expect(body.canEdit).toBe(false);
    expect(body.membership).toEqual({ role: OrganizationRole.CONTRIBUTOR });
  });

  describe("Error handling", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 for a non-existent inventory", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/carbon-inventories/999999999/access",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        getCarbonInventoryAccessService(prisma, "999999999", null)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });

    it("resolves access for an anonymous caller (userId = null)", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { createdById: testUser.id }
      );

      const result = await getCarbonInventoryAccessService(
        prisma,
        inventory.id.toString(),
        null
      );

      expect(result.membership).toBeNull();
    });
  });
});
