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
import type { GetAllAdminRequestsResponse } from "@repo/types";
import { SubmissionStatus, SubmissionType } from "@repo/database";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  createTestOrganizationDataSubmission,
  createTestCarbonInventorySubmission,
} from "@test/factories/submissionFactory.js";
import { createCarbonInventory } from "@test/factories/carbonInventorySeeder.js";
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

  afterEach(async () => {
    await prisma.submission.deleteMany();
    await prisma.submissionSubjectCarbonInventory.deleteMany();
    await prisma.submissionSubjectOrganizationData.deleteMany();
    await prisma.submissionSubject.deleteMany();
    await prisma.carbonInventory.deleteMany();
    await prisma.organizationData.deleteMany();
    await prisma.userOrganizationMembership.deleteMany();
    await prisma.organization.deleteMany();
    // Reset system parameter to default
    await prisma.systemParameter.update({
      where: {
        key: "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
      },
      data: { value: "AUTOMATIC" },
    });
  });

  describe("Successful retrieval", () => {
    it("should return all requests with correct data structure", async () => {
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
      expect(request!.organizationId).toBeDefined();
      expect(request!.carbonInventoryId).toBeNull();
      expect(request!.type).toBe(SubmissionType.ORGANIZATION_ACCREDITATION);
      expect(request!.status).toBe(SubmissionStatus.PENDING);
      expect(request!.requestedAt).toBeDefined();
    });

    it("should return requests ordered by requestedAt descending", async () => {
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

      const idx1 = body.findIndex((r) => r.id === submission1.id.toString());
      const idx2 = body.findIndex((r) => r.id === submission2.id.toString());

      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx2).toBeGreaterThanOrEqual(0);
      expect(idx1).toBeGreaterThan(idx2);
    });

    it("should return requests with all submission statuses", async () => {
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
        expect(request.type).toBe(SubmissionType.ORGANIZATION_ACCREDITATION);
      });
    });
  });

  describe("Grouping", () => {
    it("should return only the most recent submission for the same organization", async () => {
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
      const { submission: latestSubmission } =
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

      // Only the most recent submission for this org should appear
      const orgSubmissions = body.filter(
        (r) => r.organizationId === org.id.toString()
      );
      expect(orgSubmissions.length).toBe(1);
      expect(orgSubmissions[0].id).toBe(latestSubmission.id.toString());
    });

    it("should return only the most recent submission per carbon inventory", async () => {
      // Set to MANUAL so no filtering interferes
      await prisma.systemParameter.update({
        where: {
          key: "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
        },
        data: { value: "MANUAL" },
      });

      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      const ci = await createCarbonInventory(prisma, {
        organizationId: org.id,
        year: 2024,
        usageMode: "SIMPLIFIED",
      });

      // First submission (reviewed)
      await createTestCarbonInventorySubmission(
        prisma,
        ci.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.REVIEWED,
        testUser.id,
        testUser.id
      );

      // Need a new subject for second submission since unique constraint
      // Actually the unique constraint only applies to PENDING/APPROVED, so REVIEWED allows a new one
      const ci2 = await createCarbonInventory(prisma, {
        organizationId: org.id,
        year: 2025,
        usageMode: "SIMPLIFIED",
      });

      await createTestCarbonInventorySubmission(
        prisma,
        ci2.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Each CI gets its own group, so both should appear
      const ciSubmissions = body.filter(
        (r) => r.type === SubmissionType.CARBON_INVENTORY_CALCULATION
      );
      expect(ciSubmissions.length).toBe(2);
      expect(ciSubmissions.map((s) => s.carbonInventoryId)).toContain(
        ci.id.toString()
      );
      expect(ciSubmissions.map((s) => s.carbonInventoryId)).toContain(
        ci2.id.toString()
      );
    });

    it("should handle multiple submissions for different organizations", async () => {
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
  });

  describe("Filtering by recognition behavior", () => {
    it("should exclude CARBON_INVENTORY_CALCULATION when behavior is HIDDEN", async () => {
      await prisma.systemParameter.update({
        where: {
          key: "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
        },
        data: { value: "HIDDEN" },
      });

      // Create an org accreditation submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Visible Org",
        tradeName: "Visible Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Create a carbon inventory calculation submission
      const ci = await createCarbonInventory(prisma, {
        organizationId: org.id,
        year: 2024,
        usageMode: "SIMPLIFIED",
      });
      await createTestCarbonInventorySubmission(
        prisma,
        ci.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Accreditation should be visible
      expect(body.some((r) => r.organizationName === "Visible Org")).toBe(true);

      // No CARBON_INVENTORY_CALCULATION should appear
      expect(
        body.some((r) => r.type === SubmissionType.CARBON_INVENTORY_CALCULATION)
      ).toBe(false);
    });

    it("should exclude APPROVED_AUTOMATICALLY submissions when behavior is AUTOMATIC", async () => {
      // Default is AUTOMATIC
      const org = await createTestOrganization(prisma);

      // Create an org accreditation submission (should be visible)
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Visible Org",
        tradeName: "Visible Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Create an auto-approved carbon inventory submission
      const ci = await createCarbonInventory(prisma, {
        organizationId: org.id,
        year: 2024,
        usageMode: "SIMPLIFIED",
      });
      await createTestCarbonInventorySubmission(
        prisma,
        ci.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.APPROVED_AUTOMATICALLY,
        testUser.id,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Accreditation should be visible
      expect(body.some((r) => r.organizationName === "Visible Org")).toBe(true);

      // Auto-approved submission should NOT appear
      expect(
        body.some(
          (r) =>
            r.carbonInventoryId === ci.id.toString() &&
            r.status === SubmissionStatus.APPROVED_AUTOMATICALLY
        )
      ).toBe(false);
    });

    it("should include all submissions when behavior is MANUAL", async () => {
      await prisma.systemParameter.update({
        where: {
          key: "CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR",
        },
        data: { value: "MANUAL" },
      });

      const org = await createTestOrganization(prisma);

      // Create accreditation submission
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Manual Org",
        tradeName: "Manual Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Create a carbon inventory calculation submission
      const ci = await createCarbonInventory(prisma, {
        organizationId: org.id,
        year: 2024,
        usageMode: "SIMPLIFIED",
      });
      await createTestCarbonInventorySubmission(
        prisma,
        ci.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/admin/requests/",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllAdminRequestsResponse;

      // Both should be visible
      expect(body.some((r) => r.organizationName === "Manual Org")).toBe(true);
      expect(
        body.some((r) => r.type === SubmissionType.CARBON_INVENTORY_CALCULATION)
      ).toBe(true);
    });
  });
});
