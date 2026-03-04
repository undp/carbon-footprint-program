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
import type { GetAllAdminRequestsResponse } from "@repo/types";
import { SubmissionStatus, SubmissionSubjectType } from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/admin/requests/ - Integration Tests", () => {
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

  describe("Successful retrieval", () => {
    it("should return all requests with correct data structure", async () => {
      // Create test organization with submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "Test Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);

      const request = body.find((r) => r.organizationName === "Test Org");
      expect(request).toBeDefined();
      expect(request!.id).toBeDefined();
      expect(request!.type).toBe(
        SubmissionSubjectType.ORGANIZATION_ACCREDITATION
      );
      expect(request!.status).toBe(SubmissionStatus.PENDING);
      expect(request!.requestedAt).toBeDefined();
    });

    it("should return requests ordered by requestedAt descending", async () => {
      // Create multiple organizations with submissions at different times
      const org1 = await createTestOrganization(prisma);
      const orgData1 = await createTestOrganizationData(prisma, org1.id, {
        legalName: "Organization 1",
      });
      const { submission: submission1 } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData1.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

      const org2 = await createTestOrganization(prisma);
      const orgData2 = await createTestOrganizationData(prisma, org2.id, {
        legalName: "Organization 2",
      });
      const { submission: submission2 } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData2.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Find the indices of our test submissions
      const idx1 = body.findIndex((r) => r.id === submission1.id.toString());
      const idx2 = body.findIndex((r) => r.id === submission2.id.toString());

      // submission2 was created later, so it should appear before submission1
      expect(idx1).toBeGreaterThan(idx2);
    });

    it("should return requests with all submission statuses", async () => {
      // Create PENDING submission
      const org1 = await createTestOrganization(prisma);
      const orgData1 = await createTestOrganizationData(prisma, org1.id, {
        legalName: "Pending Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData1.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Create APPROVED submission
      const org2 = await createTestOrganization(prisma);
      const orgData2 = await createTestOrganizationData(prisma, org2.id, {
        legalName: "Approved Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData2.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Create REJECTED submission
      const org3 = await createTestOrganization(prisma);
      const orgData3 = await createTestOrganizationData(prisma, org3.id, {
        legalName: "Rejected Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData3.id,
        SubmissionStatus.REJECTED,
        testUser.id,
        testUser.id,
        "Rejection reason"
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      const statuses = body.map((r) => r.status);
      expect(statuses).toContain(SubmissionStatus.PENDING);
      expect(statuses).toContain(SubmissionStatus.APPROVED);
      expect(statuses).toContain(SubmissionStatus.REJECTED);
    });

    it("should return empty array when no submissions exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  describe("Data consistency", () => {
    it("should include organization name from organization data", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Specific Legal Name",
        tradeName: "Specific Trade Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      const request = body.find(
        (r) => r.organizationName === "Specific Trade Name"
      );
      expect(request).toBeDefined();
    });

    it("should return correct submission type for organization accreditation", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      expect(body.length).toBeGreaterThan(0);
      body.forEach((request) => {
        expect(request.type).toBe(
          SubmissionSubjectType.ORGANIZATION_ACCREDITATION
        );
      });
    });
  });

  describe("Multiple submissions", () => {
    it("should handle multiple submissions for different organizations", async () => {
      // Create 3 different organizations with submissions
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          legalName: `Organization ${i}`,
          tradeName: `Organization ${i}`,
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.PENDING,
          testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      expect(body.length).toBeGreaterThanOrEqual(3);
      const names = body.map((r) => r.organizationName);
      expect(names).toContain("Organization 0");
      expect(names).toContain("Organization 1");
      expect(names).toContain("Organization 2");
    });

    it("should handle multiple submissions for the same organization", async () => {
      const org = await createTestOrganization(prisma);

      // First submission (approved)
      const orgData1 = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Org Version 1",
        tradeName: "Test Org Version 1",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData1.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second submission (pending re-accreditation)
      const orgData2 = await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Org Version 2",
        tradeName: "Test Org Version 2",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData2.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Old submission name is not included
      const oldOrgVersion1Submissions = body.filter(
        (r) => r.organizationName === "Test Org Version 1"
      );
      expect(oldOrgVersion1Submissions.length).toBe(0);

      // Old submission name is replaced by the new one while is pending
      const newOrgVersion2Submissions = body.filter(
        (r) => r.organizationName === "Test Org Version 2"
      );
      expect(newOrgVersion2Submissions.length).toBe(2);
    });
  });
});
