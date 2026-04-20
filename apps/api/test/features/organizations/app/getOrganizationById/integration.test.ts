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
import type { GetOrganizationByIdResponse } from "@repo/types";
import {
  SubmissionStatus,
  OrganizationStatus,
  MembershipStatus,
} from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/app/organizations/:id - Integration Tests", () => {
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

  describe("Happy path", () => {
    it("should get organization by valid ID with all fields", async () => {
      // Create organization with full data
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Legal Name",
        tradeName: "Test Trade Name",
        taxId: "123456789",
        address: "123 Test Street",
        employeesCount: 50,
      });

      // Create membership for test user
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.id).toBe(org.id.toString());
      expect(body.legalName).toBe("Test Legal Name");
      expect(body.tradeName).toBe("Test Trade Name");
      expect(body.taxId).toBe("123456789");
      expect(body.name).toBeDefined();
      expect(body.address).toBe("123 Test Street");
      expect(body.employeesCount).toBe(50);
      expect(body.representative).toBeDefined();
      expect(body.representative.fullName).toBeDefined();
      expect(body.representative.taxId).toBeDefined();
      expect(body.representative.email).toBeDefined();
      expect(body.representative.phone).toBeDefined();
      expect(body.representative.position).toBeDefined();
      expect(body.representative.position?.id).toBeDefined();
      expect(body.representative.position?.name).toBeDefined();
      expect(body.lastSubmissionStatus).toBeNull();
      expect(body.hasUnsubmittedChanges).toBe(true);
      expect(body.status).toBe("NOT_ACCREDITED");
    });

    it("should verify isEditable flag is true for draft organization", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.isEditable).toBe(true);
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBeNull();
    });
  });

  describe("Different states", () => {
    it("should return draft organization (no submission)", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Draft Org",
        tradeName: "Draft Org",
      });
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Draft Org");
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBeNull();
      expect(body.hasUnsubmittedChanges).toBe(true);
      expect(body.isEditable).toBe(true);
    });

    it("should return pending organization (PENDING submission)", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Pending Org",
        tradeName: "Pending Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Pending Org");
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.PENDING);
      expect(body.hasUnsubmittedChanges).toBe(false);
      expect(body.isEditable).toBe(false); // Cannot edit while pending
    });

    it("should return approved organization (APPROVED submission)", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Org",
        tradeName: "Approved Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Approved Org");
      expect(body.status).toBe("ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
      expect(body.hasUnsubmittedChanges).toBe(false);
      expect(body.isEditable).toBe(true); // Can edit after approval
    });

    it("should return rejected organization (REJECTED submission)", async () => {
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
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Rejected Org");
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.REJECTED);
      expect(body.hasUnsubmittedChanges).toBe(false);
      expect(body.isEditable).toBe(true); // Can edit after rejection
    });

    it("should return blocked organization", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Blocked Org",
        tradeName: "Blocked Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Blocked Org");
      expect(body.status).toBe("BLOCKED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
      expect(body.isEditable).toBe(false); // Cannot edit when blocked
    });
  });

  describe("Accreditation status verification", () => {
    it("should derive NOT_ACCREDITED status from no submission", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBeNull();
    });

    it("should derive NOT_ACCREDITED status from PENDING submission", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.PENDING);
    });

    it("should derive ACCREDITED status from APPROVED submission", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.status).toBe("ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
    });

    it("should derive NOT_ACCREDITED status from REJECTED submission", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.REJECTED);
    });

    it("should derive BLOCKED status even if accredited", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      const orgData = await createTestOrganizationData(prisma, org.id);
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.status).toBe("BLOCKED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
    });
  });

  describe("Displayed data priority", () => {
    it("should show pending data over approved data (pending > approved)", async () => {
      const org = await createTestOrganization(prisma);

      // First: Approved version
      const approvedData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Name",
        tradeName: "Approved Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second: Pending version (should be displayed)
      const pendingData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Pending Name",
        tradeName: "Pending Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        pendingData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Pending Name");
      expect(body.legalName).toBe("Pending Name");
      expect(body.status).toBe("ACCREDITED"); // Still accredited due to approved submission
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.PENDING);
    });

    it("should show draft data over approved data (draft > approved)", async () => {
      const org = await createTestOrganization(prisma);

      // First: Approved version
      const approvedData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Name",
        tradeName: "Approved Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second: Draft version (should be displayed)
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Draft Name",
        tradeName: "Draft Name",
      });

      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Draft Name");
      expect(body.legalName).toBe("Draft Name");
      expect(body.status).toBe("ACCREDITED"); // Still accredited due to approved submission
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
      expect(body.hasUnsubmittedChanges).toBe(true);
    });

    it("should show approved data over rejected data (approved > rejected)", async () => {
      const org = await createTestOrganization(prisma);

      // First: Approved version
      const approvedData = await createTestOrganizationData(prisma, org.id, {
        legalName: "Approved Name",
        tradeName: "Approved Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second: Rejected version (should NOT be displayed)
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

      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Approved Name");
      expect(body.legalName).toBe("Approved Name");
      expect(body.status).toBe("ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.REJECTED);
    });

    it("should show draft data over rejected data (draft > rejected)", async () => {
      const org = await createTestOrganization(prisma);

      // First: Rejected version
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

      // Second: Draft version (should be displayed)
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Draft Name",
        tradeName: "Draft Name",
      });

      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.name).toBe("Draft Name");
      expect(body.legalName).toBe("Draft Name");
      expect(body.status).toBe("NOT_ACCREDITED");
      expect(body.lastSubmissionStatus).toBe(SubmissionStatus.REJECTED);
      expect(body.hasUnsubmittedChanges).toBe(true);
    });
  });

  describe("Error cases", () => {
    it("should return 403 for non-existent organization ID", async () => {
      const nonExistentId = "999999999";

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${nonExistentId}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for user without membership", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      // No membership created for testUser

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for user with deleted membership", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for invalid ID format", async () => {
      const invalidId = "invalid-id";

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${invalidId}`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });

    it("should return 400 for negative ID", async () => {
      const negativeId = "-1";

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${negativeId}`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.message).toBeTruthy();
    });
  });

  describe("Entity references", () => {
    it("should return null for optional entity references when not set", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        sectorId: null,
        subsectorId: null,
        countryOrganizationSizeId: null,
        mainActivityId: null,
        tradeName: null,
        address: null,
        employeesCount: null,
      });
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      expect(body.sector).toBeNull();
      expect(body.subsector).toBeNull();
      expect(body.countryOrganizationSize).toBeNull();
      expect(body.mainActivity).toBeNull();
      expect(body.tradeName).toBeNull();
      expect(body.address).toBeNull();
      expect(body.employeesCount).toBeNull();
    });

    it("should return entity references with id and name when set", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id);
      await createTestMembership(prisma, testUser.id, org.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${org.id.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationByIdResponse;

      // Representative position is nullable
      expect(body.representative.position).toBeDefined();
      expect(body.representative.position?.id).toBeDefined();
      expect(body.representative.position?.name).toBeDefined();
      expect(typeof body.representative.position?.id).toBe("string");
      expect(typeof body.representative.position?.name).toBe("string");
    });
  });
});
