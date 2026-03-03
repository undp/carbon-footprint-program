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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
} from "@repo/database";
import type { BlockOrganizationResponse } from "@repo/types";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("POST /api/admin/organizations/:id/block - Integration Tests", () => {
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

  afterEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Successful blocking", () => {
    it("should block an ACTIVE organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as BlockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });

      // Verify in database
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      expect(updatedOrg!.status).toBe(OrganizationStatus.BLOCKED);

      // Verify the organization was updated by the test user
      expect(updatedOrg!.updatedById).toBe(testUser.id);
    });

    it("should return error when blocking already blocked organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(409);
    });

    it("should block organization without affecting organization data", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Org",
      });

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      // Verify organization data is unchanged
      const orgDataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(orgDataCheck!.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(orgDataCheck!.legalName).toBe("Test Org");
    });

    it("should block organization without affecting accreditation status", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      // Create approved submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
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

      const blockedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      expect(submission!.status).toBe(SubmissionStatus.APPROVED);
      expect(submission!.reviewerId).toBe(testUser.id);
      expect(blockedOrg!.updatedById).toBe(testUser.id);
    });

    it("should block draft organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id); // No submission = draft

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as BlockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });
    });

    it("should block organization under review", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      // Create pending submission
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as BlockOrganizationResponse;
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

    it("should block accredited organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);

      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as BlockOrganizationResponse;
      expect(body).toEqual({ organizationId: org.id.toString() });

      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: orgData.id,
            },
          },
        },
      });

      const blockedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      // Verify submission was approved by test user
      expect(submission!.reviewerId).toBe(testUser.id);
      expect(blockedOrg!.updatedById).toBe(testUser.id);
    });
  });

  describe("Error handling", () => {
    it("should return 404 for non-existent organization", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/999999999/block",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid organization ID format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/invalid-id/block",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for negative organization ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/admin/organizations/-1/block",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Data consistency", () => {
    it("should preserve all organization data when blocking", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "TestOrg",
        taxId: "TAX-123",
      });

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      // Verify all data is preserved
      const orgDataCheck = await prisma.organizationData.findUnique({
        where: { id: orgData.id },
      });

      expect(orgDataCheck!.legalName).toBe("Test Organization");
      expect(orgDataCheck!.tradeName).toBe("TestOrg");
      expect(orgDataCheck!.taxId).toBe("TAX-123");
    });

    it("should not affect other organizations when blocking one", async () => {
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org1.id);

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org2.id);

      // Block org1
      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org1.id.toString()}/block`,
      });

      // Verify org2 is still active
      const org2Check = await prisma.organization.findUnique({
        where: { id: org2.id },
      });

      expect(org2Check!.status).toBe(OrganizationStatus.ACTIVE);
    });

    it("should update timestamps when blocking", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      const orgCreatedAt = new Date(org.createdAt);

      const updatedOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });

      expect(updatedOrg?.updatedAt).toBeTruthy();

      const orgUpdatedAt = new Date(updatedOrg!.updatedAt!);

      expect(orgUpdatedAt.getTime()).toBeGreaterThanOrEqual(
        orgCreatedAt.getTime()
      );
      // Verify the organization was updated by the test user
      expect(updatedOrg?.updatedById).toBe(testUser.id);
    });
  });

  describe("State transitions", () => {
    it("should allow ACTIVE to BLOCKED transition", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const beforeOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(beforeOrg!.status).toBe(OrganizationStatus.ACTIVE);

      await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      const afterOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterOrg!.status).toBe(OrganizationStatus.BLOCKED);

      // Verify the organization was updated by the test user
      expect(afterOrg!.updatedById).toBe(testUser.id);
    });

    it("should be idempotent (BLOCKED to BLOCKED) but throw error", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/organizations/${org.id.toString()}/block`,
      });

      expect(response.statusCode).toBe(409);

      const afterOrg = await prisma.organization.findUnique({
        where: { id: org.id },
      });
      expect(afterOrg!.status).toBe(OrganizationStatus.BLOCKED);
    });
  });
});
