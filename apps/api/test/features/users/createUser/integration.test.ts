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
import type { CreateUserResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { createUserService } from "@/features/users/createUser/service.js";

describe("POST /api/users - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testJobPositionId: string;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Get a valid job position ID for testing
    const jobPosition = await prisma.countryJobPosition.findFirst();
    if (!jobPosition) {
      throw new Error("No job positions found in database for testing");
    }
    testJobPositionId = jobPosition.id.toString();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@test.example.com",
        },
      },
    });
  });

  describe("Successful creation", () => {
    it("should create a new user with all fields", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "newuser@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "New",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateUserResponse;

      expect(body.id).toBeTruthy();
      expect(body.uuid).toBeTruthy();
      expect(body.email).toBe("newuser@test.example.com");
      expect(body.firstName).toBe("New");
      expect(body.lastName).toBe("User");
      expect(body.countryJobPositionId).toBe(testJobPositionId);
      expect(body.idpUserId).toBe("idp-user-123");
      expect(body.idpName).toBe("azure-ad");
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeNull();

      // Verify in database
      const dbUser = await prisma.user.findUnique({
        where: { id: BigInt(body.id) },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.email).toBe("newuser@test.example.com");
      expect(dbUser!.idpUserId).toBe("idp-user-123");
      expect(dbUser!.idpName).toBe("azure-ad");
    });

    it("should generate a UUID for the user", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "uuid@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "UUID",
          lastName: "Test",
          idpUserId: "idp-user-456",
          idpName: "okta",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateUserResponse;

      // UUID should be a valid format
      expect(body.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const beforeCreate = new Date();

      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "timestamps@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Timestamp",
          lastName: "Test",
          idpUserId: "idp-user-789",
          idpName: "auth0",
        },
      });

      const afterCreate = new Date();

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateUserResponse;

      const createdAt = new Date(body.createdAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });

    it("should create a user with null idpUserId and idpName", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "nullidp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Null",
          lastName: "Idp",
          idpUserId: null,
          idpName: null,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateUserResponse;

      expect(body.idpUserId).toBeNull();
      expect(body.idpName).toBeNull();
    });

    it("should create a user with a null countryJobPositionId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "nulljobposition@test.example.com",
          countryJobPositionId: null,
          firstName: "Null",
          lastName: "JobPosition",
          idpUserId: "idp-user-nulljob",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateUserResponse;
      expect(body.countryJobPositionId).toBeNull();
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "invalid-email",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when email is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when countryJobPositionId is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "nojobposition@test.example.com",
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when firstName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "nofirstname@test.example.com",
          countryJobPositionId: testJobPositionId,
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when lastName is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "nolastname@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 201 for empty firstName", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "emptyfirst@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it("should return 201 for empty lastName", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "emptylast@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe("Duplicate handling", () => {
    it("should return error when email already exists", async () => {
      // Create a user first
      await prisma.user.create({
        data: {
          email: "duplicate@test.example.com",
          countryJobPositionId: BigInt(testJobPositionId),
          firstName: "Original",
          lastName: "User",
          updatedAt: null,
        },
      });

      // Try to create another user with the same email
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "duplicate@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Duplicate",
          lastName: "User",
          idpUserId: "idp-user-999",
          idpName: "azure-ad",
        },
      });

      // Should fail with 409 Conflict
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("EMAIL_ALREADY_IN_USE");
      expect(body.message).toBe("Email already in use");
    });

    it("should return error when idpUserId already exists", async () => {
      // Create a user first with a specific idpUserId
      await prisma.user.create({
        data: {
          email: "original@test.example.com",
          countryJobPositionId: BigInt(testJobPositionId),
          firstName: "Original",
          lastName: "User",
          idpUserId: "idp-user-duplicate",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      // Try to create another user with the same idpUserId but different email
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "different@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Duplicate",
          lastName: "User",
          idpUserId: "idp-user-duplicate",
          idpName: "okta",
        },
      });

      // Should fail with 409 Conflict
      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("IDP_USER_ID_ALREADY_IN_USE");
      expect(body.message).toBe("Idp user ID already in use");
    });
  });

  describe("Foreign key constraints", () => {
    it("should return error for invalid countryJobPositionId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users",
        payload: {
          email: "invalidjob@test.example.com",
          countryJobPositionId: "999999",
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      // Should fail with 400 due to foreign key constraint
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_COUNTRY_JOB_POSITION_ID");
      expect(body.message).toBe(
        "Invalid countryJobPositionId: the provided reference does not exist"
      );
    });
  });

  describe("Service-level creator handling", () => {
    // POST /api/users requires ADMIN/SUPERADMIN auth, so `request.currentUser`
    // is always set over HTTP; exercise the anonymous-creator (`user: null`)
    // branch directly against the real database instead.
    it("creates a user with a null createdById when no creator is provided", async () => {
      const response = await createUserService(
        prisma,
        {
          email: "anonymous-creator@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Anonymous",
          lastName: "Creator",
          idpUserId: "idp-user-anonymous",
          idpName: "azure-ad",
        },
        null
      );

      expect(response.id).toBeTruthy();
      const dbUser = await prisma.user.findUnique({
        where: { id: BigInt(response.id) },
      });
      expect(dbUser!.createdById).toBeNull();
    });
  });
});
