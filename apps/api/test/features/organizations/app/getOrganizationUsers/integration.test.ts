import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
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
import { getOrganizationUsersService } from "@/features/organizations/app/getOrganizationUsers/service.js";

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

  afterEach(async () => {
    await cleanupTestMemberships(prisma);
    await cleanupTestOrganization(prisma);
    await cleanupTestUsers(prisma);
  });

  beforeEach(async () => {
    // Create a dummy admin user for each test
    adminUser = await createTestUser(prisma, {
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
    });
  });

  describe("Authorization", () => {
    it("should allow ADMIN to get users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make testUser an ADMIN
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
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
      expect(body).toBeDefined();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);

      // Check isCurrentUser
      const currentUser = body.find((u) => u.userId === testUser.id.toString());
      const otherUser = body.find((u) => u.userId === adminUser.id.toString());

      expect(currentUser?.isCurrentUser).toBe(true);
      expect(otherUser?.isCurrentUser).toBe(false);
    });

    it("should reject non-members from getting users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
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
        role: OrganizationRole.ADMIN,
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
        role: OrganizationRole.CONTRIBUTOR,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      expect(body.length).toBe(3);

      const userIds = body.map((u) => u.userId);
      expect(userIds).toContain(testUser.id.toString());
      expect(userIds).toContain(user1.id.toString());
      expect(userIds).toContain(user2.id.toString());
    });

    it("should return user details with correct roles", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
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

      const adminUserData = body.find(
        (u) => u.userId === adminUser.id.toString()
      );
      expect(adminUserData).toBeDefined();
      expect(adminUserData!.organizationRole).toBe(OrganizationRole.VIEWER);
      expect(adminUserData!.email).toBe(adminUser.email);
      expect(adminUserData!.name).toBe(
        `${adminUser.firstName} ${adminUser.lastName}`
      );
      expect(adminUserData!.isCurrentUser).toBe(false);

      const currentUserData = body.find(
        (u) => u.userId === testUser.id.toString()
      );
      expect(currentUserData).toBeDefined();
      expect(currentUserData!.isCurrentUser).toBe(true);
    });

    it("should not return deleted memberships", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
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

      expect(body.length).toBe(1);
      expect(body[0].userId).toBe(testUser.id.toString());
    });

    it("should return one user in the array when organization has only one member", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;

      expect(body.length).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("should return 403 when organization does not exist", async () => {
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

  describe("Direct service invocation (bypassing organization-role authorization)", () => {
    // requireOrganizationRole guarantees the organization exists (membership
    // rows FK-reference it), so the service's own `!organization` guard can
    // never be reached over HTTP. Call the service directly (still against
    // the real test database) to exercise it.
    it("throws OrganizationNotFoundError when the organization does not exist (service-level guard)", async () => {
      await expect(
        getOrganizationUsersService(prisma, "999999999", testUser.id.toString())
      ).rejects.toMatchObject({ code: "ORGANIZATION_NOT_FOUND" });
    });
  });

  describe("Name construction and sorting edge cases", () => {
    it("falls back to an empty name when the member has no firstName or lastName", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const nameless = await createTestUser(prisma, {
        email: "nameless@example.com",
        firstName: null,
        lastName: null,
      });
      await createTestMembership(prisma, nameless.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;
      const namelessUser = body.find(
        (u) => u.userId === nameless.id.toString()
      );
      expect(namelessUser?.name).toBe("");
    });

    it("sorts users with the same organization role alphabetically by name", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const zed = await createTestUser(prisma, {
        email: "zed@example.com",
        firstName: "Zed",
        lastName: "Zephyr",
      });
      await createTestMembership(prisma, zed.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const alice = await createTestUser(prisma, {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Anderson",
      });
      await createTestMembership(prisma, alice.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id}/users`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrganizationUsersResponse;
      const viewerIds = body
        .filter((u) => u.organizationRole === OrganizationRole.VIEWER)
        .map((u) => u.userId);

      expect(viewerIds).toEqual([alice.id.toString(), zed.id.toString()]);
    });
  });
});
