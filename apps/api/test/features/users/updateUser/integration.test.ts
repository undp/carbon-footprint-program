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
import type { UpdateUserResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("PATCH /api/users/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testJobPositionId: bigint;
  let secondJobPositionId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;

    // Get valid job position IDs for testing
    const jobPositions = await prisma.countryJobPosition.findMany({
      take: 2,
    });
    if (jobPositions.length < 2) {
      throw new Error("Need at least 2 job positions in database for testing");
    }
    testJobPositionId = jobPositions[0].id;
    secondJobPositionId = jobPositions[1].id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test users before each test
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@test.example.com",
        },
      },
    });
  });

  describe("Successful updates", () => {
    it("should update user email", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "original@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          email: "updated@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.email).toBe("updated@test.example.com");
      expect(body.firstName).toBe("Original"); // Unchanged
      expect(body.lastName).toBe("User"); // Unchanged
    });

    it("should update user firstName only", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updatefirst@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "Name",
          idpUserId: "idp-user-456",
          idpName: "okta",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          firstName: "Updated",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.firstName).toBe("Updated");
      expect(body.lastName).toBe("Name"); // Unchanged
      expect(body.email).toBe("updatefirst@test.example.com"); // Unchanged
    });

    it("should update user lastName only", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updatelast@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "Name",
          idpUserId: "idp-user-789",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          lastName: "Updated",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.lastName).toBe("Updated");
      expect(body.firstName).toBe("Original"); // Unchanged
    });

    it("should update user countryJobPositionId", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updatejob@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Job",
          lastName: "Update",
          idpUserId: "idp-user-101",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          countryJobPositionId: secondJobPositionId.toString(),
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.countryJobPositionId).toBe(secondJobPositionId.toString());
    });

    it("should update user idpUserId", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updateidpuser@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Idp",
          lastName: "User",
          idpUserId: "original-idp-user",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          idpUserId: "updated-idp-user",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.idpUserId).toBe("updated-idp-user");
      expect(body.idpName).toBe("azure-ad"); // Unchanged
    });

    it("should update user idpName", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updateidpname@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Idp",
          lastName: "Name",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          idpName: "okta",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.idpName).toBe("okta");
      expect(body.idpUserId).toBe("idp-user-123"); // Unchanged
    });

    it("should update idpUserId and idpName together", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updatebothidp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Both",
          lastName: "Idp",
          idpUserId: "original-idp-user",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          idpUserId: "new-idp-user",
          idpName: "auth0",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.idpUserId).toBe("new-idp-user");
      expect(body.idpName).toBe("auth0");
    });

    it("should set idpUserId and idpName to null", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "nullidp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Null",
          lastName: "Idp",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          idpUserId: null,
          idpName: null,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.idpUserId).toBeNull();
      expect(body.idpName).toBeNull();
    });

    it("should update all fields at once", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updateall@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "User",
          idpUserId: "original-idp-user",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          email: "allupdated@test.example.com",
          countryJobPositionId: secondJobPositionId.toString(),
          firstName: "Fully",
          lastName: "Updated",
          idpUserId: "updated-idp-user",
          idpName: "okta",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.email).toBe("allupdated@test.example.com");
      expect(body.countryJobPositionId).toBe(secondJobPositionId.toString());
      expect(body.firstName).toBe("Fully");
      expect(body.lastName).toBe("Updated");
      expect(body.idpUserId).toBe("updated-idp-user");
      expect(body.idpName).toBe("okta");
    });

    it("should update updatedAt timestamp", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "timestamp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Timestamp",
          lastName: "Test",
          idpUserId: "idp-user-202",
          idpName: "auth0",
        },
      });

      // Use the user's existing updatedAt timestamp (same as createdAt on creation)
      const beforeUpdate = createdUser.updatedAt;

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          firstName: "Updated",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      const updatedAt = new Date(body.updatedAt);
      expect(updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });
  });

  describe("Error handling", () => {
    it("should return 404 when user does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/999999",
        payload: {
          firstName: "Updated",
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/invalid-id",
        payload: {
          firstName: "Updated",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid email format", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "invalidemail@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-303",
          idpName: "azure-ad",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          email: "not-valid-email",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 200 for empty firstName", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "emptyfirst@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-404",
          idpName: "okta",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          firstName: "",
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it("should return 409 when email already in use (P2002)", async () => {
      // Create first user
      await prisma.user.create({
        data: {
          email: "existing@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "First",
          lastName: "User",
          idpUserId: "idp-user-606",
          idpName: "azure-ad",
        },
      });

      // Create second user
      const secondUser = await prisma.user.create({
        data: {
          email: "second@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Second",
          lastName: "User",
          idpUserId: "idp-user-707",
          idpName: "okta",
        },
      });

      // Try to update second user's email to first user's email
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${secondUser.id}`,
        payload: {
          email: "existing@test.example.com",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("EMAIL_ALREADY_IN_USE");
      expect(body.message).toBe("Email already in use");
    });

    it("should return 409 when idpUserId already in use (P2002)", async () => {
      // Create first user with a specific idpUserId
      await prisma.user.create({
        data: {
          email: "original@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "User",
          idpUserId: "idp-user-duplicate",
          idpName: "azure-ad",
        },
      });

      // Create second user with different idpUserId
      const secondUser = await prisma.user.create({
        data: {
          email: "second@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Second",
          lastName: "User",
          idpUserId: "idp-user-unique",
          idpName: "okta",
        },
      });

      // Try to update second user's idpUserId to first user's idpUserId
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${secondUser.id}`,
        payload: {
          idpUserId: "idp-user-duplicate",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("IDP_USER_ID_ALREADY_IN_USE");
      expect(body.message).toBe("Idp user ID already in use");
    });

    it("should return 400 when countryJobPositionId is invalid (P2003)", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "invalidjob@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Test",
          lastName: "User",
          idpUserId: "idp-user-808",
          idpName: "auth0",
        },
      });

      // Use a non-existent job position ID (a very large number)
      const invalidJobPositionId = "999999999999999999";

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {
          countryJobPositionId: invalidJobPositionId,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("INVALID_COUNTRY_JOB_POSITION_ID");
      expect(body.message).toBe(
        "Invalid countryJobPositionId: the provided reference does not exist"
      );
    });
  });

  describe("Partial updates", () => {
    it("should allow empty payload (no changes)", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "nochange@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "No",
          lastName: "Change",
          idpUserId: "idp-user-505",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.email).toBe("nochange@test.example.com");
      expect(body.firstName).toBe("No");
      expect(body.lastName).toBe("Change");
    });
  });
});
