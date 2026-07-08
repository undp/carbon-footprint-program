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
  MembershipStatus,
  SubmissionStatus,
} from "@repo/database";
import type { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";

describe("GET /api/app/organizations/me - Integration Tests", () => {
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
    it("should return organizations where user has ACTIVE membership in EntityReference format", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "TestOrg",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: org.id.toString(),
        name: "TestOrg",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });

    it("should return multiple organizations if user is member of multiple", async () => {
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org1.id, {
        tradeName: "Organization One",
      });
      await createTestMembership(prisma, testUser.id, org1.id, {
        status: MembershipStatus.ACTIVE,
      });

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org2.id, {
        tradeName: "Organization Two",
      });
      await createTestMembership(prisma, testUser.id, org2.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(2);

      const org1Response = body.find((o) => o.id === org1.id.toString());
      const org2Response = body.find((o) => o.id === org2.id.toString());

      expect(org1Response).toEqual({
        id: org1.id.toString(),
        name: "Organization One",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
      expect(org2Response).toEqual({
        id: org2.id.toString(),
        name: "Organization Two",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });
  });

  describe("Membership filtering", () => {
    it("should exclude organizations where user has DELETED membership", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: "Deleted Membership Org",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(0);
    });

    it("should exclude organizations where user is not a member", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: "Non-member Org",
      });
      // No membership created

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(0);
    });

    it("should return empty array if user has no memberships", async () => {
      // Create organization but no membership
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toEqual([]);
    });
  });

  describe("Organization status handling", () => {
    it("should return BLOCKED organizations if user is member", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: "Blocked Org",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: org.id.toString(),
        name: "Blocked Org",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });

    it("should return both ACTIVE and BLOCKED organizations where user has ACTIVE membership", async () => {
      const activeOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg.id, {
        tradeName: "Active Org",
      });
      await createTestMembership(prisma, testUser.id, activeOrg.id, {
        status: MembershipStatus.ACTIVE,
      });

      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id, {
        tradeName: "Blocked Org",
      });
      await createTestMembership(prisma, testUser.id, blockedOrg.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(2);

      const activeOrgResponse = body.find(
        (o) => o.id === activeOrg.id.toString()
      );
      const blockedOrgResponse = body.find(
        (o) => o.id === blockedOrg.id.toString()
      );

      expect(activeOrgResponse).toEqual({
        id: activeOrg.id.toString(),
        name: "Active Org",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
      expect(blockedOrgResponse).toEqual({
        id: blockedOrg.id.toString(),
        name: "Blocked Org",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });
  });

  describe("Data consistency", () => {
    it("should use tradeName as the name in EntityReference format", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Legal Name Corp",
        tradeName: "Trade Name Inc",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body[0].name).toBe("Trade Name Inc");
      expect(body[0].name).not.toBe("Legal Name Corp");
    });

    it("should return organizations in consistent format", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: "Test Company",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("isAccredited");
      expect(body[0]).toHaveProperty("lastSubmissionStatus");
      expect(typeof body[0].id).toBe("string");
      expect(typeof body[0].name).toBe("string");
      expect(typeof body[0].isAccredited).toBe("boolean");
      expect(Object.keys(body[0])).toHaveLength(4);
    });
  });

  describe("Mixed scenarios", () => {
    it("should handle mix of ACTIVE and DELETED memberships correctly", async () => {
      const activeOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg.id, {
        tradeName: "Active Membership Org",
      });
      await createTestMembership(prisma, testUser.id, activeOrg.id, {
        status: MembershipStatus.ACTIVE,
      });

      const deletedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, deletedOrg.id, {
        tradeName: "Deleted Membership Org",
      });
      await createTestMembership(prisma, testUser.id, deletedOrg.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: activeOrg.id.toString(),
        name: "Active Membership Org",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });

    it("should only return organizations with ACTIVE membership status regardless of organization status", async () => {
      // BLOCKED org with ACTIVE membership - should appear
      const blockedActiveOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedActiveOrg.id, {
        tradeName: "Blocked Active Membership",
      });
      await createTestMembership(prisma, testUser.id, blockedActiveOrg.id, {
        status: MembershipStatus.ACTIVE,
      });

      // ACTIVE org with DELETED membership - should not appear
      const activeDeletedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeDeletedOrg.id, {
        tradeName: "Active Deleted Membership",
      });
      await createTestMembership(prisma, testUser.id, activeDeletedOrg.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0]).toEqual({
        id: blockedActiveOrg.id.toString(),
        name: "Blocked Active Membership",
        isAccredited: false,
        lastSubmissionStatus: null,
      });
    });
  });

  describe("Accreditation and last submission status fields", () => {
    it("should return isAccredited=false and lastSubmissionStatus=null when the organization has no submissions", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, org.id, {
        tradeName: "Draft Org No Submission",
      });
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0].isAccredited).toBe(false);
      expect(body[0].lastSubmissionStatus).toBeNull();
    });

    it("should return isAccredited=true and lastSubmissionStatus=APPROVED when the organization has an approved accreditation submission", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        tradeName: "Approved Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0].isAccredited).toBe(true);
      expect(body[0].lastSubmissionStatus).toBe(SubmissionStatus.APPROVED);
    });

    it("should keep isAccredited=true while lastSubmissionStatus=PENDING when a previously accredited organization submits a new edition", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // First edition: approved, grants accreditation.
      const approvedData = await createTestOrganizationData(prisma, org.id, {
        tradeName: "Re-submitted Org",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        approvedData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second edition: pending review, becomes the latest submission.
      const pendingData = await createTestOrganizationData(prisma, org.id, {
        tradeName: "Re-submitted Org v2",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        pendingData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      await createTestMembership(prisma, testUser.id, org.id, {
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetMyOrganizationsSelectorOptionsResponse;

      expect(body).toHaveLength(1);
      expect(body[0].isAccredited).toBe(true);
      expect(body[0].lastSubmissionStatus).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Authentication", () => {
    it.skip("unauthenticated request receives 401", () => {
      // Tests run with AUTH_PROVIDER=forced-user, which always resolves a
      // pre-seeded user regardless of the Authorization header, so an
      // "unauthenticated" request cannot be simulated through `app.inject` in
      // this environment. The 401 path (declared on this route's schema and
      // enforced by `requireAuth`) is exercised by the authentication
      // plugin's own unit tests.
    });
  });
});
