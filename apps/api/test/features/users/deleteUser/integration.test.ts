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
import type { DeleteUserResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("DELETE /api/users/:id - Integration Tests", () => {
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

  describe("Successful deletion", () => {
    it("should delete a user and return success message", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "todelete@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "ToDelete",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/users/${createdUser.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as DeleteUserResponse;
      expect(body.message).toBe("User deleted successfully");
      expect(body.id).toBe(createdUser.id.toString());
    });

    it("should remove user from database after deletion", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "removedb@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Remove",
          lastName: "FromDB",
          idpUserId: "idp-user-456",
          idpName: "okta",
          updatedAt: null,
        },
      });

      const userId = createdUser.id;

      // Verify user exists before deletion
      const beforeDelete = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(beforeDelete).not.toBeNull();

      await app.inject({
        method: "DELETE",
        url: `/api/users/${userId}`,
      });

      // Verify user is removed from database
      const afterDelete = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(afterDelete).toBeNull();
    });

    it("should not affect other users when deleting one", async () => {
      const user1 = await prisma.user.create({
        data: {
          email: "user1@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "User",
          lastName: "One",
          idpUserId: "idp-user-789",
          idpName: "auth0",
          updatedAt: null,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: "user2@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "User",
          lastName: "Two",
          idpUserId: "idp-user-101",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      // Delete user1
      await app.inject({
        method: "DELETE",
        url: `/api/users/${user1.id}`,
      });

      // Verify user2 still exists
      const remainingUser = await prisma.user.findUnique({
        where: { id: user2.id },
      });
      expect(remainingUser).not.toBeNull();
      expect(remainingUser!.email).toBe("user2@test.example.com");
    });
  });

  describe("Error handling", () => {
    it("should return 404 when user does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/999999",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/users/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 404 when trying to delete same user twice", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "deletetwice@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Delete",
          lastName: "Twice",
          idpUserId: "idp-user-202",
          idpName: "okta",
          updatedAt: null,
        },
      });

      // First delete should succeed
      const firstResponse = await app.inject({
        method: "DELETE",
        url: `/api/users/${createdUser.id}`,
      });
      expect(firstResponse.statusCode).toBe(200);

      // Second delete should return 404
      const secondResponse = await app.inject({
        method: "DELETE",
        url: `/api/users/${createdUser.id}`,
      });
      expect(secondResponse.statusCode).toBe(404);
    });
  });
});
