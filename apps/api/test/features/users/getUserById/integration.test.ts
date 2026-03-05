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
import type { GetUserByIdResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/users/:id - Integration Tests", () => {
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
    it("should return a user by ID", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "getbyid@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "GetById",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetUserByIdResponse;

      expect(body.id).toBe(createdUser.id.toString());
      expect(body.email).toBe("getbyid@test.example.com");
      expect(body.firstName).toBe("GetById");
      expect(body.lastName).toBe("User");
      expect(body.uuid).toBeTruthy();
      expect(body.countryJobPositionId).toBe(testJobPositionId.toString());
      expect(body.idpUserId).toBe("idp-user-123");
      expect(body.idpName).toBe("azure-ad");
    });

    it("should return user with all fields", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "allfields@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "All",
          lastName: "Fields",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetUserByIdResponse;

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
    });

    it("should return user with null optional fields", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "nulloptional@test.example.com",
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
        url: `/api/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetUserByIdResponse;

      expect(body.firstName).toBeNull();
      expect(body.lastName).toBeNull();
      expect(body.idpUserId).toBeNull();
      expect(body.idpName).toBeNull();
      expect(body.createdById).toBeNull();
      expect(body.updatedById).toBeNull();
    });
  });

  describe("Error handling", () => {
    it("should return 404 when user does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/999999",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/users/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
