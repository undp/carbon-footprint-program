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
import type { UpdateOrganizationUserRoleResponse } from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { MembershipStatus, OrganizationRole } from "@repo/database/enums";
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

describe("PATCH /api/app/organizations/:organizationId/users/:userId - Integration Tests", () => {
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
    it("should allow ADMIN to update user role", async () => {
      const organization = await createTestOrganization(prisma);

      // Make testUser an ADMIN
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      // Add adminUser as VIEWER
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.CONTRIBUTOR,
        },
      });
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationUserRoleResponse;
      expect(body.role).toBe(OrganizationRole.CONTRIBUTOR);
    });

    it("should reject VIEWER role from updating user roles", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      // Make testUser a VIEWER
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const targetUser = await createTestUser(prisma, {
        email: "target@example.com",
      });
      await createTestMembership(prisma, targetUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${targetUser.id}`,
        payload: {
          role: OrganizationRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject CONTRIBUTOR role from updating user roles", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      // Make testUser an CONTRIBUTOR
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.CONTRIBUTOR,
      });

      const targetUser = await createTestUser(prisma, {
        email: "target@example.com",
      });
      await createTestMembership(prisma, targetUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${targetUser.id}`,
        payload: {
          role: OrganizationRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject non-members from updating user roles", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      // testUser is not a member

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe("You do not have access to this organization");
    });
  });

  describe("Successful role update", () => {
    it("should update user role from VIEWER to CONTRIBUTOR", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.CONTRIBUTOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationUserRoleResponse;

      expect(body.role).toBe(OrganizationRole.CONTRIBUTOR);

      // Verify in database
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: adminUser.id,
          organizationId: organization.id,
          status: MembershipStatus.ACTIVE,
        },
      });

      expect(membership!.role).toBe(OrganizationRole.CONTRIBUTOR);
      expect(membership!.createdById).toBe(testUser.id);
    });

    it("should update user role from VIEWER to ADMIN", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.ADMIN,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationUserRoleResponse;

      expect(body.role).toBe(OrganizationRole.ADMIN);

      // Verify updatedById is set
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: adminUser.id,
          organizationId: organization.id,
          status: MembershipStatus.ACTIVE,
        },
      });
      expect(membership!.updatedById).toBe(testUser.id);
    });

    it("should update user role from ADMIN to VIEWER", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationUserRoleResponse;

      expect(body.role).toBe(OrganizationRole.VIEWER);
    });
  });

  describe("Error handling", () => {
    it("should return 403 when organization does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/999999/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 404 when user is not a member", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const nonMember = await createTestUser(prisma, {
        email: "nonmember@example.com",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${nonMember.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MEMBERSHIP_NOT_FOUND");
    });

    it("should return 403 when trying to update own role and it is the last admin", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${testUser.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CANNOT_MODIFY_SELF");
    });

    it("should return 400 when role is missing", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when role is invalid", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: "INVALID_ROLE",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when organizationId is invalid", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/invalid/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when userId is invalid", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/invalid`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should allow demoting an admin when there are multiple admins", async () => {
      const organization = await createTestOrganization(prisma);

      // Create two admins
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ADMIN,
      });

      // Demote adminUser (testUser is still admin, so this should work)
      const response = await app.inject({
        method: "PATCH",
        url: `/api/app/organizations/${organization.id}/users/${adminUser.id}`,
        payload: {
          role: OrganizationRole.CONTRIBUTOR,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as UpdateOrganizationUserRoleResponse;
      expect(body.role).toBe(OrganizationRole.CONTRIBUTOR);

      // Verify there's still one admin in the database
      const adminCount = await prisma.userOrganizationMembership.count({
        where: {
          organizationId: organization.id,
          role: OrganizationRole.ADMIN,
          status: "ACTIVE",
        },
      });
      expect(adminCount).toBe(1);
    });
  });
});
