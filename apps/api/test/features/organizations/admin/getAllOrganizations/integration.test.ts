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
import type { PrismaClient } from "@repo/database";
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

describe("GET /api/admin/organizations/ - Integration Tests", () => {
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

  beforeEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Successful retrieval", () => {
    it("should return all organizations with pagination", async () => {
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
      expect(body.limit).toBeDefined();
      expect(body.offset).toBeDefined();
      expect(body.total).toBeDefined();
      expect(body.totalPages).toBeDefined();
      expect(body.hasNext).toBeDefined();
      expect(body.hasPrev).toBeDefined();
    });

    it("should return organizations with correct accreditation status", async () => {
      // Draft organization (NOT_ACCREDITED)
      const draftOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, draftOrg.id, {
        legalName: "Draft Org",
      });

      // Under review organization (NOT_ACCREDITED)
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
        SubmissionStatus.PENDING
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
      await createTestOrganizationDataSubmission(
        prisma,
        accreditedOrgData.id,
        SubmissionStatus.APPROVED
      );

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

      expect(draftResponse!.status).toBe("NOT_ACCREDITED");
      expect(reviewResponse!.status).toBe("NOT_ACCREDITED");
      expect(accreditedResponse!.status).toBe("ACCREDITED");
    });

    it("should return organizations with both NOT_ACCREDITED and BLOCKED statuses", async () => {
      // ACTIVE and NOT_ACCREDITED organization
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

      expect(activeResponse!.status).toBe("NOT_ACCREDITED");
      expect(blockedResponse!.status).toBe("BLOCKED");
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
        url: "/api/admin/organizations/?statuses=NOT_ACCREDITED",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      // All returned organizations should be NOT_ACCREDITED
      body.data.forEach((org) => {
        expect(org.status).toBe("NOT_ACCREDITED");
      });

      // Blocked org should not be in results
      const blockedInResults = body.data.some(
        (o) => o.id === blockedOrg.id.toString()
      );
      expect(blockedInResults).toBe(false);
    });

    it("should filter organizations by accreditationStatus", async () => {
      const draftOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, draftOrg.id);

      const accreditedOrg = await createTestOrganization(prisma);
      const accreditedOrgData = await createTestOrganizationData(
        prisma,
        accreditedOrg.id
      );
      await createTestOrganizationDataSubmission(
        prisma,
        accreditedOrgData.id,
        SubmissionStatus.APPROVED
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?statuses=ACCREDITED",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      // All returned organizations should be ACCREDITED
      body.data.forEach((org) => {
        expect(org.status).toBe("ACCREDITED");
      });

      // Draft org should not be in results
      const draftInResults = body.data.some(
        (o) => o.id === draftOrg.id.toString()
      );
      expect(draftInResults).toBe(false);
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

    it("should include organization even with no ACTIVE data", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Organization A",
        tradeName: "Organization A",
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllOrganizationsResponse;

      const orgResponse = body.data.find((o) => o.id === org.id.toString());

      // Organization should still appear even without data
      expect(orgResponse).toBeDefined();
    });
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
      expect(orgResponse!.status).toBe("NOT_ACCREDITED");
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
        SubmissionStatus.PENDING
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
      expect(orgResponse!.status).toBe("NOT_ACCREDITED");
    });

    it("should return lastSubmissionStatus=APPROVED and hasUnsubmittedChanges=false for an accredited org", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Accredited Org",
        tradeName: "Accredited Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED
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
      expect(orgResponse!.status).toBe("ACCREDITED");
    });

    it("should return lastSubmissionStatus=REJECTED and hasUnsubmittedChanges=true for a rejected org", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Rejected Org",
        tradeName: "Rejected Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED
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
      expect(orgResponse!.hasUnsubmittedChanges).toBe(true);
      expect(orgResponse!.status).toBe("NOT_ACCREDITED");
    });

    it("should show ACCREDITED status and PENDING lastSubmissionStatus for re-accreditation", async () => {
      const org = await createTestOrganization(prisma);

      // First org_data: APPROVED (accreditation)
      const approvedOrgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Data",
        tradeName: "Approved Data",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedOrgData.id,
        SubmissionStatus.APPROVED
      );

      // Second org_data: PENDING re-accreditation with updated name
      const pendingOrgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Updated Data",
        tradeName: "Updated Data",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        pendingOrgData.id,
        SubmissionStatus.PENDING
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
      // Should be ACCREDITED because there's an APPROVED submission on ACTIVE org_data
      expect(orgResponse!.status).toBe("ACCREDITED");
      // Latest submission is PENDING
      expect(orgResponse!.lastSubmissionStatus).toBe("PENDING");
      // The displayed name should come from the PENDING row (higher priority)
      expect(orgResponse!.name).toBe("Updated Data");
      // PENDING submission covers the new data, so no unsubmitted changes
      expect(orgResponse!.hasUnsubmittedChanges).toBe(false);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid page parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/organizations/?offset=invalid",
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
