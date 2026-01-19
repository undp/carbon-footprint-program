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
import type { GetOrCreateMeResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/users/me - Integration Tests", () => {
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

  beforeEach(async () => {
    // Clean up test users before each test
    await prisma.user.deleteMany({
      where: {
        OR: [
          {
            email: {
              contains: "@test.example.com",
            },
          },
          {
            idpUserId: {
              startsWith: "test-idp-",
            },
          },
        ],
      },
    });
  });

  describe("Successful retrieval", () => {
    it("should return a user found by idpUserId", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "findbyidp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "FindBy",
          lastName: "Idp",
          idpUserId: "test-idp-123",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "test-idp-123",
          email: "different@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrCreateMeResponse;

      expect(body).not.toBeNull();
      if (body) {
        expect(body.id).toBe(createdUser.id.toString());
        expect(body.email).toBe("findbyidp@test.example.com");
        expect(body.idpUserId).toBe("test-idp-123");
        expect(body.firstName).toBe("FindBy");
        expect(body.lastName).toBe("Idp");
      }
    });

    it("should return a user found by email", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "findbyemail@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "FindBy",
          lastName: "Email",
          idpUserId: "test-idp-456",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "different-idp",
          email: "findbyemail@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrCreateMeResponse;

      expect(body).not.toBeNull();
      if (body) {
        expect(body.id).toBe(createdUser.id.toString());
        expect(body.email).toBe("findbyemail@test.example.com");
        expect(body.idpUserId).toBe("test-idp-456");
        expect(body.firstName).toBe("FindBy");
        expect(body.lastName).toBe("Email");
      }
    });

    it("should return a user when both idpUserId and email match", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "bothmatch@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Both",
          lastName: "Match",
          idpUserId: "test-idp-789",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "test-idp-789",
          email: "bothmatch@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrCreateMeResponse;

      expect(body).not.toBeNull();
      if (body) {
        expect(body.id).toBe(createdUser.id.toString());
        expect(body.email).toBe("bothmatch@test.example.com");
        expect(body.idpUserId).toBe("test-idp-789");
      }
    });

    it("should return user with all fields", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "allfields@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "All",
          lastName: "Fields",
          idpUserId: "test-idp-allfields",
          idpName: "auth0",
        },
      });

      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "test-idp-allfields",
          email: "allfields@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrCreateMeResponse;

      expect(body).not.toBeNull();
      if (body) {
        // Validate all schema fields are present
        expect(body).toHaveProperty("id");
        expect(body).toHaveProperty("uuid");
        expect(body).toHaveProperty("email");
        expect(body).toHaveProperty("countryJobPositionId");
        expect(body).toHaveProperty("firstName");
        expect(body).toHaveProperty("lastName");
        expect(body).toHaveProperty("idpUserId");
        expect(body).toHaveProperty("idpName");
        expect(body).toHaveProperty("createdAt");
        expect(body).toHaveProperty("updatedAt");
        expect(body).toHaveProperty("createdById");
        expect(body).toHaveProperty("updatedById");
      }
    });
  });

  describe("User not found", () => {
    it("should return null when user is not found by idpUserId or email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "non-existent-idp",
          email: "nonexistent@test.example.com",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetOrCreateMeResponse;
      expect(body).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should return 400 for invalid email format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "test-idp-123",
          email: "invalid-email",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing idpUserId", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          email: "test@test.example.com",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for missing email", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {
          idpUserId: "test-idp-123",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/users/me",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
