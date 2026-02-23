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
import type { GetOrganizationUsersResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { OrganizationRole, MembershipStatus } from "@repo/database/enums";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  getTestLoggedUser,
  createTestUser,
  cleanupTestUsers,
} from "@test/factories/userFactory.js";
import {
  createTestMembership,
  cleanupTestMemberships,
} from "@test/factories/membershipFactory.js";

describe("GET /api/app/organizations/:organizationId/users - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let adminUser: User;

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
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
    await cleanupTestUsers(prisma);

    // Create a dummy admin user for each test
    adminUser = await createTestUser(prisma, {
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
    });
  });

  describe("Authorization", () => {
    it("should allow ORGANIZATION_ADMIN to get users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make testUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Add another member
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;
      expect(body.users).toBeDefined();
      expect(Array.isArray(body.users)).toBe(true);
      expect(body.users.length).toBe(2);
    });

    it("should reject VIEWER role from getting users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Make testUser a VIEWER
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject ORGANIZATION_CONTRIBUTOR role from getting users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Make testUser an ORGANIZATION_CONTRIBUTOR
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_CONTRIBUTOR,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject non-members from getting users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // testUser is not a member

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe("You do not have access to this organization");
    });
  });

  describe("Successful retrieval", () => {
    it("should return all active users in organization", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const user1 = await createTestUser(prisma, {
        email: "user1@example.com",
        firstName: "User",
        lastName: "One",
      });
      await createTestMembership(prisma, user1.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const user2 = await createTestUser(prisma, {
        email: "user2@example.com",
        firstName: "User",
        lastName: "Two",
      });
      await createTestMembership(prisma, user2.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_CONTRIBUTOR,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      expect(body.users.length).toBe(3);

      const userIds = body.users.map((u) => u.userId);
      expect(userIds).toContain(testUser.id.toString());
      expect(userIds).toContain(user1.id.toString());
      expect(userIds).toContain(user2.id.toString());
    });

    it("should return user details with correct roles", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      const adminUserData = body.users.find(
        (u) => u.userId === adminUser.id.toString()
      );
      expect(adminUserData).toBeDefined();
      expect(adminUserData!.organizationRole).toBe(OrganizationRole.VIEWER);
      expect(adminUserData!.email).toBe(adminUser.email);
      expect(adminUserData!.name).toBe(
        `${adminUser.firstName} ${adminUser.lastName}`
      );
    });

    it("should not return deleted memberships", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Create a deleted membership
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      expect(body.users.length).toBe(1);
      expect(body.users[0].userId).toBe(testUser.id.toString());
    });

    it("should return empty array when organization has only one member", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      expect(body.users.length).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when organization does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/999999/users",
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 400 when organizationId is invalid", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/invalid/users",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
