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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
} from "@repo/database";
import type { UnblockOrganizationResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("POST /api/admin/organizations/:id/unblock - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Successful unblocking", () => {
    it("should unblock a BLOCKED organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UnblockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });

      // Verify in database
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      expect(updatedOrg!.status).toBe(OrganizationStatus.ACTIVE);

      // Verify the organization was updated by the test user
      expect(updatedOrg!.updatedById).toBe(testUser.id);
    });

    it("should return error when unblocking already active organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(409);
    });

    it("should unblock organization without affecting organization data", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Org",
      });

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      // Verify organization data is unchanged
      const orgDataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(orgDataCheck!.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(orgDataCheck!.legalName).toBe("Test Org");
    });

    it("should unblock organization without affecting accreditation status", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      // Create approved submission
      const { submission: createdSubmission } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(200);

      // Verify submission is still approved and was approved by test user
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: orgData.id,
            },
          },
        },
      });

      expect(submission!.status).toBe(SubmissionStatus.APPROVED);
      expect(submission!.reviewerId).toBe(testUser.id);
    });

    it("should unblock draft organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id); // No submission = draft

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UnblockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });
    });

    it("should unblock organization under review", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      // Create pending submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UnblockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });

      // Verify submission remains pending
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: orgData.id,
            },
          },
        },
      });

      expect(submission!.status).toBe(SubmissionStatus.PENDING);
    });

    it("should unblock accredited organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UnblockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });

      const unblockedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      // Verify submission was approved by test user
      expect(submission.reviewerId).toBe(testUser.id);
      expect(unblockedOrg!.updatedById).toBe(testUser.id);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent organization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/999999999/unblock",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid organization ID format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/invalid-id/unblock",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative organization ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/-1/unblock",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Data consistency", () => {
    it("should preserve all organization data when unblocking", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "TestOrg",
        taxId: "TAX-123",
      });

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      // Verify all data is preserved
      const orgDataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(orgDataCheck!.legalName).toBe("Test Organization");
      expect(orgDataCheck!.tradeName).toBe("TestOrg");
      expect(orgDataCheck!.taxId).toBe("TAX-123");
    });

    it("should not affect other organizations when unblocking one", async () => {
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org1.id);

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org2.id);

      // Unblock org1
      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org1.id.toString()}/unblock`,
      });

      // Verify org2 is still blocked
      const org2Check = await prisma.organization.findUnique({
        where: { id: org2.id },
      });

      expect(org2Check!.status).toBe(OrganizationStatus.BLOCKED);
    });

    it("should update timestamps when unblocking", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const beforeUnblock = new Date();

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      const afterUnblock = new Date();

      const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      const updatedAt = new Date(updatedOrg!.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeUnblock.getTime()
      );
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterUnblock.getTime());

      // Verify the organization was updated by the test user
      expect(updatedOrg!.updatedById).toBe(testUser.id);
    });
  });

  describe("State transitions", () => {
    it("should allow BLOCKED to ACTIVE transition", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const beforeOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(beforeOrg!.status).toBe(OrganizationStatus.BLOCKED);

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      const afterOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterOrg!.status).toBe(OrganizationStatus.ACTIVE);

      // Verify the organization was updated by the test user
      expect(afterOrg!.updatedById).toBe(testUser.id);
    });

    it("should be idempotent (ACTIVE to ACTIVE) but throw error", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(response.statusCode).toBe(409);

      const afterOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterOrg!.status).toBe(OrganizationStatus.ACTIVE);
    });
  });

  describe("Block and unblock cycle", () => {
    it("should allow blocking and then unblocking an organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      // Block
      const blockResponse = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(blockResponse.statusCode).toBe(200);
      const afterBlock = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterBlock!.status).toBe(OrganizationStatus.BLOCKED);

      // Unblock
      const unblockResponse = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      expect(unblockResponse.statusCode).toBe(200);
      const afterUnblock = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterUnblock!.status).toBe(OrganizationStatus.ACTIVE);

      // Verify the organization was updated by the test user in both operations
      expect(afterBlock!.updatedById).toBe(testUser.id);
      expect(afterUnblock!.updatedById).toBe(testUser.id);
    });

    it("should preserve data integrity through block/unblock cycle", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Persistent Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Block
      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      // Unblock
      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/unblock`,
      });

      // Verify data is intact
      const orgDataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });
      expect(orgDataCheck!.legalName).toBe("Persistent Org");

      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: orgData.id,
            },
          },
        },
      });
      const unblockedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(submission!.status).toBe(SubmissionStatus.APPROVED);
      expect(submission!.reviewerId).toBe(testUser.id);
      expect(unblockedOrg!.updatedById).toBe(testUser.id);
    });
  });
});
