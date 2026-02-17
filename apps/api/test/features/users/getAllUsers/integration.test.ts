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
import type { GetAllUsersResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

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
      expect(testUser!.createdAt).toBeTruthy();
      expect(testUser!.updatedAt).toBeTruthy();
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
        },
      });

      await prisma.user.create({
        data: {
          email: "second@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Second",
          lastName: "User",
          createdAt: newerDate,
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
});
