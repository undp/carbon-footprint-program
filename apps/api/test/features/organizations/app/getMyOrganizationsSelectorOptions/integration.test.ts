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
import type { MyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { MembershipStatus, OrganizationStatus } from "@repo/database";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";

describe("GET /api/app/organizations/me - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Get the test user that will be used for authenticated requests
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await cleanupTestOrganization(prisma);
  });

  describe("Happy path", () => {
    it("should retrieve user's organizations with active membership", async () => {
      // Create test organization with active membership for test user
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "My Organization",
        tradeName: "My Organization",
      });

      // Create active membership for test user
      await createTestMembership(prisma, testUserId, org.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
      expect(body[0]).toMatchObject({
        id: org.id.toString(),
        name: "My Organization",
      });
    });

    it("should retrieve multiple organizations for user", async () => {
      // Create first organization
      const org1 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org1.id, {
        legalName: "Organization One",
        tradeName: "Organization One",
      });
      await createTestMembership(prisma, testUserId, org1.id);

      // Create second organization
      const org2 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org2.id, {
        legalName: "Organization Two",
        tradeName: "Organization Two",
      });
      await createTestMembership(prisma, testUserId, org2.id);

      // Create third organization
      const org3 = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org3.id, {
        legalName: "Organization Three",
        tradeName: "Organization Three",
      });
      await createTestMembership(prisma, testUserId, org3.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(3);

      const orgIds = body.map((org) => org.id);
      expect(orgIds).toContain(org1.id.toString());
      expect(orgIds).toContain(org2.id.toString());
      expect(orgIds).toContain(org3.id.toString());
    });
  });

  describe("Empty result", () => {
    it("should return empty array when user has no organizations", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it("should return empty array when user only has deleted memberships", async () => {
      // Create organization with deleted membership
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Deleted Membership Org",
        tradeName: "Deleted Membership Org",
      });

      await createTestMembership(prisma, testUserId, org.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });
  });

  describe("Membership filtering", () => {
    it("should only return organizations with active memberships", async () => {
      // Create organization with active membership
      const activeOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, activeOrg.id, {
        legalName: "Active Membership Org",
        tradeName: "Active Membership Org",
      });
      await createTestMembership(prisma, testUserId, activeOrg.id);

      // Create organization with deleted membership
      const deletedOrg = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, deletedOrg.id, {
        legalName: "Deleted Membership Org",
        tradeName: "Deleted Membership Org",
      });
      await createTestMembership(prisma, testUserId, deletedOrg.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(body.length).toBe(1);
      expect(body[0].id).toBe(activeOrg.id.toString());
    });
  });

  describe("Organization status handling", () => {
    it("should return both active and blocked organizations", async () => {
      // Create active organization
      const activeOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prisma, activeOrg.id, {
        legalName: "Active Organization",
        tradeName: "Active Organization",
      });
      await createTestMembership(prisma, testUserId, activeOrg.id);

      // Create blocked organization
      const blockedOrg = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });
      await createTestOrganizationData(prisma, blockedOrg.id, {
        legalName: "Blocked Organization",
        tradeName: "Blocked Organization",
      });
      await createTestMembership(prisma, testUserId, blockedOrg.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(body.length).toBe(2);

      const orgIds = body.map((org) => org.id);
      expect(orgIds).toContain(activeOrg.id.toString());
      expect(orgIds).toContain(blockedOrg.id.toString());
    });
  });

  describe("Response structure", () => {
    it("should return correct response structure with id and name", async () => {
      const org = await createTestOrganization(prisma);
      await createTestOrganizationData(prisma, org.id, {
        legalName: "Test Organization",
        tradeName: "Test Organization",
      });
      await createTestMembership(prisma, testUserId, org.id);

      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/me",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as MyOrganizationsSelectorOptionsResponse;

      expect(body.length).toBe(1);
      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("name");
      expect(typeof body[0].id).toBe("string");
      expect(typeof body[0].name).toBe("string");
    });
  });
});
