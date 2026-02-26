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
import type { AddOrganizationUserResponse } from "@repo/types";
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

describe("POST /api/app/organizations/:organizationId/users - Integration Tests", () => {
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
    it("should allow ORGANIZATION_ADMIN to add users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make testUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddOrganizationUserResponse;
      expect(body.userId).toBe(adminUser.id.toString());
      expect(body.role).toBe(OrganizationRole.VIEWER);
      expect(body.membershipId).toBeDefined();
    });

    it("should reject VIEWER role from adding users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Make testUser a VIEWER
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const newUser = await createTestUser(prisma, {
        email: "newuser@example.com",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: newUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject ORGANIZATION_CONTRIBUTOR role from adding users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // Make testUser an ORGANIZATION_CONTRIBUTOR
      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_CONTRIBUTOR,
      });

      const newUser = await createTestUser(prisma, {
        email: "newuser@example.com",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: newUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe(
        "Insufficient permissions for this organization"
      );
    });

    it("should reject non-members from adding users", async () => {
      const organization = await createTestOrganization(prisma);

      // Make adminUser an ORGANIZATION_ADMIN
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // testUser is not a member

      const newUser = await createTestUser(prisma, {
        email: "newuser@example.com",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: newUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
      expect(body.message).toBe("You do not have access to this organization");
    });
  });

  describe("Successful user addition", () => {
    it("should add user with VIEWER role", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddOrganizationUserResponse;

      expect(body.userId).toBe(adminUser.id.toString());
      expect(body.role).toBe(OrganizationRole.VIEWER);
      expect(body.membershipId).toBeDefined();

      // Verify in database
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: adminUser.id,
          organizationId: organization.id,
        },
      });

      expect(membership).toBeDefined();
      expect(membership!.role).toBe(OrganizationRole.VIEWER);
      expect(membership!.status).toBe(MembershipStatus.ACTIVE);
      expect(membership!.createdById).toBe(testUser.id);
    });

    it("should add user with ORGANIZATION_ADMIN role", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: OrganizationRole.ORGANIZATION_ADMIN,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddOrganizationUserResponse;

      expect(body.role).toBe(OrganizationRole.ORGANIZATION_ADMIN);

      // Verify createdById is set
      const membership = await prisma.userOrganizationMembership.findFirst({
        where: {
          userId: adminUser.id,
          organizationId: organization.id,
        },
      });
      expect(membership!.createdById).toBe(testUser.id);
    });

    it("should add user with ORGANIZATION_CONTRIBUTOR role", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: OrganizationRole.ORGANIZATION_CONTRIBUTOR,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddOrganizationUserResponse;

      expect(body.role).toBe(OrganizationRole.ORGANIZATION_CONTRIBUTOR);
    });
  });

  describe("Error handling", () => {
    it("should return 403 when organization does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/app/organizations/999999/users",
        payload: {
          email: adminUser.email,
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 404 when user email does not exist", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: "nonexistent@example.com",
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("USER_NOT_FOUND_BY_EMAIL");
    });

    it("should return 409 when user already has active membership", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      // adminUser already has a membership
      await createTestMembership(prisma, adminUser.id, organization.id, {
        role: OrganizationRole.VIEWER,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: OrganizationRole.ORGANIZATION_ADMIN,
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MEMBERSHIP_ALREADY_EXISTS");
    });

    it("should return 400 when email is missing", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          role: OrganizationRole.VIEWER,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when role is missing", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when role is invalid", async () => {
      const organization = await createTestOrganization(prisma);

      await createTestMembership(prisma, testUser.id, organization.id, {
        role: OrganizationRole.ORGANIZATION_ADMIN,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/users`,
        payload: {
          email: adminUser.email,
          role: "INVALID_ROLE",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
