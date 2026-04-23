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
import type { GetAdminRequestsKpisResponse } from "@repo/types";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/admin/requests/kpis - Integration Tests", () => {
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

  describe("Successful KPI retrieval", () => {
    it("should return KPIs with correct structure", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      expect(body).toHaveProperty("total");
      expect(body).toHaveProperty("counts");
      expect(typeof body.total).toBe("number");
      expect(Array.isArray(body.counts)).toBe(true);
    });

    it("should return zero counts when no submissions exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      expect(body.total).toBe(0);

      // Should have entries for all types × all statuses (5 × 5 = 25), including APPROVED_AUTOMATICALLY
      const allTypes = Object.values(SubmissionType);
      const allStatuses = Object.values(SubmissionStatus);

      expect(body.counts.length).toBe(allTypes.length * allStatuses.length);

      body.counts.forEach((count) => {
        expect(count.value).toBe(0);
        expect(allTypes).toContain(count.type);
        expect(allStatuses).toContain(count.status);
      });
    });

    it("should count PENDING submissions correctly", async () => {
      // Create 3 PENDING submissions
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.PENDING,
          testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      expect(body.total).toBe(3);

      const pendingOrgAccreditation = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.PENDING
      );
      expect(pendingOrgAccreditation).toBeDefined();
      expect(pendingOrgAccreditation!.value).toBe(3);
    });

    it("should count APPROVED submissions correctly", async () => {
      // Create 2 APPROVED submissions
      for (let i = 0; i < 2; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      expect(body.total).toBe(2);

      const approvedOrgAccreditation = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.APPROVED
      );
      expect(approvedOrgAccreditation).toBeDefined();
      expect(approvedOrgAccreditation!.value).toBe(2);
    });

    it("should count REJECTED submissions correctly", async () => {
      // Create 1 REJECTED submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED,
        testUser.id,
        testUser.id,
        "Rejection reason"
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      expect(body.total).toBe(1);

      const rejectedOrgAccreditation = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.REJECTED
      );
      expect(rejectedOrgAccreditation).toBeDefined();
      expect(rejectedOrgAccreditation!.value).toBe(1);
    });
  });

  describe("Mixed status KPIs", () => {
    it("should correctly aggregate counts across multiple statuses", async () => {
      // Create 2 PENDING
      for (let i = 0; i < 2; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.PENDING,
          testUser.id
        );
      }

      // Create 3 APPROVED
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );
      }

      // Create 1 REJECTED
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED,
        testUser.id,
        testUser.id,
        "Rejection reason"
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      // Total should be 2 + 3 + 1 = 6
      expect(body.total).toBe(6);

      const pendingCount = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.PENDING
      )!.value;
      const approvedCount = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.APPROVED
      )!.value;
      const rejectedCount = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.REJECTED
      )!.value;

      expect(pendingCount).toBe(2);
      expect(approvedCount).toBe(3);
      expect(rejectedCount).toBe(1);
    });

    it("should return all type/status combinations even if some have zero counts", async () => {
      // Create only PENDING submissions
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
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      // Should have entries for all types × all statuses (including APPROVED_AUTOMATICALLY)
      const allTypes = Object.values(SubmissionType);
      const allStatuses = Object.values(SubmissionStatus);

      expect(body.counts.length).toBe(allTypes.length * allStatuses.length);

      // APPROVED and REJECTED should have zero counts
      const approvedOrgAccreditation = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.APPROVED
      );
      const rejectedOrgAccreditation = body.counts.find(
        (c) =>
          c.type === SubmissionType.ORGANIZATION_ACCREDITATION &&
          c.status === SubmissionStatus.REJECTED
      );

      expect(approvedOrgAccreditation!.value).toBe(0);
      expect(rejectedOrgAccreditation!.value).toBe(0);
    });
  });

  describe("Data consistency", () => {
    it("should have total equal to sum of all counts", async () => {
      // Create various submissions
      for (let i = 0; i < 2; i++) {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id);
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          i % 2 === 0 ? SubmissionStatus.PENDING : SubmissionStatus.APPROVED,
          testUser.id,
          i % 2 === 0 ? undefined : testUser.id
        );
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      const sumOfCounts = body.counts.reduce(
        (sum, count) => sum + count.value,
        0
      );
      expect(body.total).toBe(sumOfCounts);
    });
  });

  describe("Organization accreditation type", () => {
    it("should only count ORGANIZATION_ACCREDITATION type submissions", async () => {
      // Create organization accreditation submission
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
        url: "/api/admin/requests/kpis",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAdminRequestsKpisResponse;

      // All counts should be for ORGANIZATION_ACCREDITATION type
      const orgAccreditationCounts = body.counts.filter(
        (c) => c.type === SubmissionType.ORGANIZATION_ACCREDITATION
      );

      // Verify that organization accreditation has non-zero pending count
      const pendingCount = orgAccreditationCounts.find(
        (c) => c.status === SubmissionStatus.PENDING
      );
      expect(pendingCount).toBeDefined();
      expect(pendingCount!.value).toBe(1);

      const nonOrgCounts = body.counts.filter(
        (c) => c.type !== SubmissionType.ORGANIZATION_ACCREDITATION
      );
      expect(nonOrgCounts.every((c) => c.value === 0)).toBe(true);
    });
  });
});
