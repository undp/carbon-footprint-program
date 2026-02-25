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
import type { GetAllOrganizationsResponse } from "@repo/types";
import {
  SubmissionStatus,
  OrganizationStatus,
  OrganizationDataStatus,
} from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("GET /api/admin/organizations/ - Integration Tests", () => {
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
    it("should return all organizations without pagination if query params are not provided", async () => {
      // Create test organizations
      const org1 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org1.id, {
        legalName: "Organization A",
        tradeName: "Organization A",
      });

      const org2 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org2.id, {
        legalName: "Organization B",
        tradeName: "Organization B",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(2);
      expect(body.limit).toBeUndefined();
      expect(body.offset).toBeUndefined();
      expect(body.total).toBeUndefined();
      expect(body.totalPages).toBeUndefined();
      expect(body.hasNext).toBeUndefined();
      expect(body.hasPrev).toBeUndefined();
    });

    it("should return organizations with correct accreditation status", async () => {
      // Draft organization (not accredited)
      const draftOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, draftOrg.id, {
        legalName: "Draft Org",
      });

      // Under review organization (not accredited)
      const reviewOrg = await createTestOrganization(prisma);
      const reviewOrgData = await createTestOrganizationData(
        prisma,
        reviewOrg.id,
        {
          legalName: "Review Org",
        }
      );
      await createTestOrganizationDataSubmission(
        prisma,
        reviewOrgData.id,
        SubmissionStatus.PENDING,
        testUser.id,
        testUser.id
      );

      // Accredited organization
      const accreditedOrg = await createTestOrganization(prisma);
      const accreditedOrgData = await createTestOrganizationData(
        prisma,
        accreditedOrg.id,
        {
          legalName: "Accredited Org",
        }
      );
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        accreditedOrgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Verify the submission was approved by the test user
      expect(submission.reviewerId).toBe(testUser.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const draftResponse = body.data.find(
        (o) => o.id === draftOrg.id.toString()
      );
      const reviewResponse = body.data.find(
        (o) => o.id === reviewOrg.id.toString()
      );
      const accreditedResponse = body.data.find(
        (o) => o.id === accreditedOrg.id.toString()
      );

      expect(draftResponse!.status).toBe("ACTIVE");
      expect(draftResponse!.isAccredited).toBe(false);
      expect(reviewResponse!.status).toBe("ACTIVE");
      expect(reviewResponse!.isAccredited).toBe(false);
      expect(accreditedResponse!.status).toBe("ACTIVE");
      expect(accreditedResponse!.isAccredited).toBe(true);
    });

    it("should return organizations with both not accredited and BLOCKED statuses", async () => {
      // ACTIVE and not accredited organization
      const activeOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg.id, {
        legalName: "Active Org",
      });

      // BLOCKED organization
      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id, {
        legalName: "Blocked Org",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const activeResponse = body.data.find(
        (o) => o.id === activeOrg.id.toString()
      );
      const blockedResponse = body.data.find(
        (o) => o.id === blockedOrg.id.toString()
      );

      expect(activeResponse!.status).toBe("ACTIVE");
      expect(activeResponse!.isAccredited).toBe(false);
      expect(blockedResponse!.status).toBe("BLOCKED");
      expect(blockedResponse!.isAccredited).toBe(false);
    });
  });

  describe("Pagination", () => {
    it("should respect offset and limit parameters", async () => {
      // Create multiple organizations
      for (let i = 0; i < 5; i++) {
        const org = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, org.id, {
          legalName: `Organization ${i}`,
        });
      }

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?offset=0&limit=2",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      expect(body.data.length).toBeLessThanOrEqual(2);
      expect(body.offset).toBe(0);
      expect(body.limit).toBe(2);
    });

    it("should return second set of results", async () => {
      // Create multiple organizations
      for (let i = 0; i < 5; i++) {
        const org = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, org.id, {
          legalName: `Organization ${i}`,
        });
      }

      const page1Response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?offset=0&limit=2",
      });

      const page2Response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?offset=2&limit=2",
      });

      expect(page1Response.statusCode).toBe(200);
      expect(page2Response.statusCode).toBe(200);

      const page1Body = JSON.parse(
        page1Response.body
      ) as GetAllOrganizationsResponse;
      const page2Body = JSON.parse(
        page2Response.body
      ) as GetAllOrganizationsResponse;

      // Verify different results on different pages
      const page1Ids = page1Body.data.map((o) => o.id);
      const page2Ids = page2Body.data.map((o) => o.id);

      expect(page1Ids).not.toEqual(page2Ids);
    });

    it("should return empty array for offset beyond total", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?offset=990&limit=10",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      expect(body.data.length).toBe(0);
    });
  });

  describe("Sorting", () => {
    it("should sort organizations by name ascending", async () => {
      const org1 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org1.id, {
        legalName: "Zebra Company",
        tradeName: "Zebra Company",
      });

      const org2 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org2.id, {
        legalName: "Alpha Company",
        tradeName: "Alpha Company",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?sortBy=name&sortOrder=asc",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const zebraIndex = body.data.findIndex((o) => o.name === "Zebra Company");
      const alphaIndex = body.data.findIndex((o) => o.name === "Alpha Company");

      expect(alphaIndex).toBeLessThan(zebraIndex);
    });

    it("should sort organizations by name descending", async () => {
      const org1 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org1.id, {
        legalName: "Alpha Company",
        tradeName: "Alpha Company",
      });

      const org2 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org2.id, {
        legalName: "Zebra Company",
        tradeName: "Zebra Company",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?sortBy=name&sortOrder=desc",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const zebraIndex = body.data.findIndex((o) => o.name === "Zebra Company");
      const alphaIndex = body.data.findIndex((o) => o.name === "Alpha Company");

      expect(zebraIndex).toBeLessThan(alphaIndex);
    });
  });

  describe("Filtering", () => {
    it("should filter organizations by status", async () => {
      const activeOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg.id);

      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?statuses=ACTIVE",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      // All returned organizations should be ACTIVE and not accredited
      body.data.forEach((org) => {
        expect(org.status).toBe("ACTIVE");
        expect(org.isAccredited).toBe(false);
      });

      // Blocked org should not be in results
      const blockedInResults = body.data.some(
        (o) => o.id === blockedOrg.id.toString()
      );
      expect(blockedInResults).toBe(false);
    });

    it("should filter organizations by BLOCKED status", async () => {
      const activeOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, activeOrg.id);

      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?statuses=BLOCKED",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      // All returned organizations should be BLOCKED
      body.data.forEach((org) => {
        expect(org.status).toBe("BLOCKED");
      });

      // Active org should not be in results
      const activeInResults = body.data.some(
        (o) => o.id === activeOrg.id.toString()
      );
      expect(activeInResults).toBe(false);
    });
  });

  describe("Data consistency", () => {
    it("should only return ACTIVE organization data, not OUTDATED", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
        legalName: "Active Data",
        tradeName: "Active Data",
      });

      // Create outdated data
      await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.OUTDATED,
        legalName: "Outdated Data",
        tradeName: "Outdated Data",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const orgResponse = body.data.find((o) => o.id === org.id.toString());
      expect(orgResponse!.name).toBe("Active Data");
    });

    describe("Submission status and unsubmitted changes", () => {
      it("should return lastSubmissionStatus=null and hasUnsubmittedChanges=true for a new draft org", async () => {
        const org = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, org.id, {
          legalName: "Draft Org",
          tradeName: "Draft Org",
        });

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.lastSubmissionStatus).toBeNull();
        expect(orgResponse!.hasUnsubmittedChanges).toBe(true);
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(false);
      });

      it("should return lastSubmissionStatus=PENDING and hasUnsubmittedChanges=false for an org under review", async () => {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Review Org",
          tradeName: "Review Org",
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.lastSubmissionStatus).toBe("PENDING");
        expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(false);
      });

      it("should return lastSubmissionStatus=APPROVED and hasUnsubmittedChanges=false for an accredited org", async () => {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Accredited Org",
          tradeName: "Accredited Org",
        });
        const { submission } = await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.lastSubmissionStatus).toBe("APPROVED");
        expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(true);

        // Verify submission was approved by test user
        expect(submission.reviewerId).toBe(testUser.id);
      });

      it("should return lastSubmissionStatus=REJECTED and hasUnsubmittedChanges=false for a rejected org (initial rejection)", async () => {
        const org = await createTestOrganization(prisma);
        const orgData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Rejected Org",
          tradeName: "Rejected Org",
        });
        await createTestOrganizationDataSubmission(
          prisma,
          orgData.id,
          SubmissionStatus.REJECTED,
          testUser.id,
          testUser.id
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.lastSubmissionStatus).toBe("REJECTED");
        expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(false);
      });

      it("should show ACCREDITED status and PENDING lastSubmissionStatus for re-accreditation", async () => {
        const org = await createTestOrganization(prisma);

        // First org_data: APPROVED (accreditation)
        const approvedOrgData = await createTestOrganizationData(
          prisma,
          org.id,
          {
            legalName: "Approved Data",
            tradeName: "Approved Data",
          }
        );
        await createTestOrganizationDataSubmission(
          prisma,
          approvedOrgData.id,
          SubmissionStatus.APPROVED,
          testUser.id
        );

        // Second org_data: PENDING re-accreditation with updated name
        const pendingOrgData = await createTestOrganizationData(
          prisma,
          org.id,
          {
            legalName: "Updated Data",
            tradeName: "Updated Data",
          }
        );
        await createTestOrganizationDataSubmission(
          prisma,
          pendingOrgData.id,
          SubmissionStatus.PENDING,
          testUser.id,
          testUser.id
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.name).toBe("Updated Data");
        // Should be ACTIVE and accredited because there's an APPROVED submission on ACTIVE org_data
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(true);
        // Latest submission is PENDING
        expect(orgResponse!.lastSubmissionStatus).toBe("PENDING");
        // The displayed name should come from the PENDING row (higher priority)
        expect(orgResponse!.name).toBe("Updated Data");
        // PENDING submission covers the new data, so no unsubmitted changes
        expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
      });

      it("should return lastSubmissionStatus=REJECTED and hasUnsubmittedChanges=false for a re-accreditation rejection", async () => {
        const org = await createTestOrganization(prisma);

        // 1. Approved version (Accredited)
        const approvedData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Approved Name",
          tradeName: "Approved Name",
        });
        await createTestOrganizationDataSubmission(
          prisma,
          approvedData.id,
          SubmissionStatus.APPROVED,
          testUser.id
        );

        // 2. Rejected version (Re-accreditation attempt, stays ACTIVE)
        const rejectedData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Rejected Name",
          tradeName: "Rejected Name",
        });
        await createTestOrganizationDataSubmission(
          prisma,
          rejectedData.id,
          SubmissionStatus.REJECTED,
          testUser.id,
          testUser.id
        );

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(true);
        expect(orgResponse!.lastSubmissionStatus).toBe("REJECTED");
        expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
        // APPROVED has display priority (3) over REJECTED (4): official data is shown
        expect(orgResponse!.name).toBe("Approved Name");
      });

      it("should return status=BLOCKED even if accredited", async () => {
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
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.status).toBe("BLOCKED");
        expect(orgResponse!.lastSubmissionStatus).toBe("APPROVED");

        // Verify submission was approved by test user
        expect(submission.reviewerId).toBe(testUser.id);
      });

      it("should show draft data as current even when there was an approved version", async () => {
        const org = await createTestOrganization(prisma);

        // 1. Approved version
        const approvedData = await createTestOrganizationData(prisma, org.id, {
          legalName: "Official Name",
          tradeName: "Official Name",
        });
        await createTestOrganizationDataSubmission(
          prisma,
          approvedData.id,
          SubmissionStatus.APPROVED,
          testUser.id,
          testUser.id
        );

        // 2. New Draft (ACTIVE, no submission)
        await createTestOrganizationData(prisma, org.id, {
          legalName: "New Draft Name",
          tradeName: "New Draft Name",
        });

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;
        const orgResponse = body.data.find((o) => o.id === org.id.toString());

        expect(orgResponse).toBeDefined();
        expect(orgResponse!.name).toBe("New Draft Name");
        expect(orgResponse!.status).toBe("ACTIVE");
        expect(orgResponse!.isAccredited).toBe(true);
        expect(orgResponse!.hasUnsubmittedChanges).toBe(true);
        expect(orgResponse!.lastSubmissionStatus).toBe("APPROVED");
      });
    });

    describe("Filtering", () => {
      it("should filter organizations by multiple statuses [array]", async () => {
        // 1. Active
        const activeOrg = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, activeOrg.id);

        // 2. Blocked
        const blockedOrg = await createTestOrganization(prisma, {
          status: OrganizationStatus.BLOCKED,
        });
        await createTestOrganizationData(prisma, blockedOrg.id);

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?statuses=ACTIVE&statuses=BLOCKED",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

        expect(body.data.length).toBeGreaterThanOrEqual(2);
        const statuses = body.data.map((o) => o.status);
        expect(statuses).toContain("ACTIVE");
        expect(statuses).toContain("BLOCKED");
        const ids = body.data.map((o) => o.id);
        expect(ids).toContain(activeOrg.id.toString());
        expect(ids).toContain(blockedOrg.id.toString());
      });
      it("should filter organizations by multiple statuses [comma separated]", async () => {
        // 1. Active
        const activeOrg = await createTestOrganization(prisma);
        await createTestOrganizationData(prisma, activeOrg.id);

        // 2. Blocked
        const blockedOrg = await createTestOrganization(prisma, {
          status: OrganizationStatus.BLOCKED,
        });
        await createTestOrganizationData(prisma, blockedOrg.id);

        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?statuses=ACTIVE,BLOCKED",
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

        expect(body.data.length).toBeGreaterThanOrEqual(2);
        const statuses = body.data.map((o) => o.status);
        expect(statuses).toContain("ACTIVE");
        expect(statuses).toContain("BLOCKED");
        const ids = body.data.map((o) => o.id);
        expect(ids).toContain(activeOrg.id.toString());
        expect(ids).toContain(blockedOrg.id.toString());
      });
      it("should return 400 for invalid page parameter", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?offset=invalid",
        });

        expect(response.statusCode).toBe(400);
      });
      it("should return 400 for invalid statuses parameter [comma separated]", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?statuses=invalid,NOT_ACCREDITED",
        });

        expect(response.statusCode).toBe(400);
      });

      it("should return 400 for invalid statuses parameter [array]", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?statuses=invalid&statuses=NOT_ACCREDITED",
        });

        expect(response.statusCode).toBe(400);
      });

      it("should return 400 for invalid pageSize parameter", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?limit=invalid",
        });

        expect(response.statusCode).toBe(400);
      });

      it("should return 400 for invalid sortOrder", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/api/admin/organizations/?sortOrder=invalid",
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
});
