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
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import type { GetAllUsersResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
} from "@repo/database";
import { OrganizationRole, MembershipStatus } from "@repo/database/enums";

describe("GET /api/users - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testJobPositionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Get a valid job position ID for testing
    const jobPosition = await prisma.countryJobPosition.findFirst();
    if (!jobPosition) {
      throw new Error("No job positions found in database for testing");
    }
    testJobPositionId = jobPosition.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up org-membership fixtures before the users/orgs they reference
    await prisma.userOrganizationMembership.deleteMany();
    await prisma.submission.deleteMany();
    await prisma.submissionSubjectOrganizationData.deleteMany();
    await prisma.submissionSubject.deleteMany();
    await prisma.organizationData.deleteMany();
    await prisma.organization.deleteMany();

    // Clean up test users after each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@test.example.com",
        },
      },
    });
  });

  describe("Successful retrieval", () => {
    it("should return an array of users", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      expect(Array.isArray(body)).toBe(true);
    });

    it("should return users with expected attributes", async () => {
      // Create a test user first
      await prisma.user.create({
        data: {
          email: "getall@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;

      const testUser = body.find((u) => u.email === "getall@test.example.com");
      expect(testUser).toBeDefined();
      expect(testUser!.firstName).toBe("Test");
      expect(testUser!.lastName).toBe("User");
      expect(testUser!.id).toBeTruthy();
      expect(testUser!.uuid).toBeTruthy();
      expect(testUser!.countryJobPositionId).toBe(testJobPositionId.toString());
      expect(testUser!.idpUserId).toBe("idp-user-123");
      expect(testUser!.idpName).toBe("azure-ad");
      expect(testUser!.createdAt).toBeDefined();
      expect(testUser!.updatedAt).toBeNull();
    });
  });

  describe("Ordering", () => {
    it("should return users ordered by creation date (newest first)", async () => {
      // Create users with explicit, distinct creation times
      const baseDate = new Date();
      const olderDate = new Date(baseDate.getTime() - 1000); // 1 second ago
      const newerDate = new Date(baseDate.getTime() + 1000); // 1 second in future

      await prisma.user.create({
        data: {
          email: "first@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "First",
          lastName: "User",
          createdAt: olderDate,
          updatedAt: null,
        },
      });

      await prisma.user.create({
        data: {
          email: "second@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Second",
          lastName: "User",
          createdAt: newerDate,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;

      const firstIdx = body.findIndex(
        (u) => u.email === "first@test.example.com"
      );
      const secondIdx = body.findIndex(
        (u) => u.email === "second@test.example.com"
      );

      // Second user (newer) should appear before first user (older)
      expect(secondIdx).toBeLessThan(firstIdx);
    });
  });

  describe("Response schema", () => {
    it("should return users with all required fields", async () => {
      await prisma.user.create({
        data: {
          email: "schema@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Schema",
          lastName: "Test",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;

      const user = body.find((u) => u.email === "schema@test.example.com");
      expect(user).toBeDefined();

      // Validate all schema fields are present
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("uuid");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("countryJobPositionId");
      expect(user).toHaveProperty("firstName");
      expect(user).toHaveProperty("lastName");
      expect(user).toHaveProperty("idpUserId");
      expect(user).toHaveProperty("idpName");
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("updatedAt");
      expect(user).toHaveProperty("createdById");
      expect(user).toHaveProperty("updatedById");
    });

    it("should handle users with null optional fields", async () => {
      await prisma.user.create({
        data: {
          email: "nullfields@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: null,
          lastName: null,
          idpUserId: null,
          idpName: null,
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;

      const user = body.find((u) => u.email === "nullfields@test.example.com");
      expect(user).toBeDefined();
      expect(user!.firstName).toBeNull();
      expect(user!.lastName).toBeNull();
      expect(user!.idpUserId).toBeNull();
      expect(user!.idpName).toBeNull();
    });
  });

  describe("Job position derivation", () => {
    it("should return jobPositionName null when the user has no country job position", async () => {
      await prisma.user.create({
        data: {
          email: "nojobposition@test.example.com",
          countryJobPositionId: null,
          firstName: "No",
          lastName: "Job",
          updatedAt: null,
        },
      });

      const response = await app.inject({ method: "GET", url: "/api/users" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      const user = body.find(
        (u) => u.email === "nojobposition@test.example.com"
      );
      expect(user).toBeDefined();
      expect(user!.countryJobPositionId).toBeNull();
      expect(user!.jobPositionName).toBeNull();
    });
  });

  describe("Organization membership derivation", () => {
    it("should include the organization name from an accredited org's summary", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const user = await prisma.user.create({
        data: {
          email: "orgmember@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Org",
          lastName: "Member",
          updatedAt: null,
        },
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
        tradeName: "Acme Trading Co",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        user.id
      );
      await createTestMembership(prisma, user.id, org.id, {
        role: OrganizationRole.ADMIN,
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({ method: "GET", url: "/api/users" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      const found = body.find((u) => u.email === "orgmember@test.example.com");
      expect(found).toBeDefined();
      expect(found!.organizations).toHaveLength(1);
      expect(found!.organizations[0].organizationId).toBe(org.id.toString());
      expect(found!.organizations[0].organizationName).toBe("Acme Trading Co");
      expect(found!.organizations[0].role).toBe(OrganizationRole.ADMIN);
    });

    it("should fall back to an empty organizationName when the org has no summary", async () => {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const user = await prisma.user.create({
        data: {
          email: "nosummary@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "No",
          lastName: "Summary",
          updatedAt: null,
        },
      });
      // No organizationData/accreditation submission is created for this org,
      // so organization_summary_view has no row for it (summary is null).
      await createTestMembership(prisma, user.id, org.id, {
        role: OrganizationRole.VIEWER,
        status: MembershipStatus.ACTIVE,
      });

      const response = await app.inject({ method: "GET", url: "/api/users" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      const found = body.find((u) => u.email === "nosummary@test.example.com");
      expect(found).toBeDefined();
      expect(found!.organizations).toHaveLength(1);
      expect(found!.organizations[0].organizationName).toBe("");
    });
  });

  describe("Active/inactive derivation", () => {
    it("should mark the user as active when lastAccessAt is within the threshold", async () => {
      await prisma.user.create({
        data: {
          email: "recentaccess@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Recent",
          lastName: "Access",
          lastAccessAt: new Date(),
          updatedAt: null,
        },
      });

      const response = await app.inject({ method: "GET", url: "/api/users" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      const found = body.find(
        (u) => u.email === "recentaccess@test.example.com"
      );
      expect(found).toBeDefined();
      expect(found!.active).toBe(true);
    });

    it("should mark the user as inactive when lastAccessAt is older than the threshold", async () => {
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 9999);

      await prisma.user.create({
        data: {
          email: "staleaccess@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Stale",
          lastName: "Access",
          lastAccessAt: staleDate,
          updatedAt: null,
        },
      });

      const response = await app.inject({ method: "GET", url: "/api/users" });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllUsersResponse;
      const found = body.find(
        (u) => u.email === "staleaccess@test.example.com"
      );
      expect(found).toBeDefined();
      expect(found!.active).toBe(false);
    });
  });

  describe("Application configuration errors", () => {
    it("should return 500 when USER_INACTIVE_THRESHOLD_DAYS is misconfigured", async () => {
      const original = await prisma.systemParameter.findUniqueOrThrow({
        where: { key: "USER_INACTIVE_THRESHOLD_DAYS" },
      });

      try {
        await prisma.systemParameter.update({
          where: { key: "USER_INACTIVE_THRESHOLD_DAYS" },
          data: { value: "not-a-number" },
        });

        const response = await app.inject({
          method: "GET",
          url: "/api/users",
        });

        expect(response.statusCode).toBe(500);
        // The handler catches the underlying ApplicationConfigError and maps it
        // to a generic 500 body, so assert that stable shape to confirm the
        // misconfiguration surfaced through this handler's catch path rather
        // than as an incidental, unrelated 500.
        const body = JSON.parse(response.body) as { error: string };
        expect(body.error).toBe("Failed to retrieve users");
      } finally {
        await prisma.systemParameter.update({
          where: { key: "USER_INACTIVE_THRESHOLD_DAYS" },
          data: { value: original.value },
        });
      }
    });
  });
});
