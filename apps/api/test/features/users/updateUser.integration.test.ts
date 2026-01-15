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

    it("should update all fields at once", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "updateall@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "User",
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
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;

      expect(body.email).toBe("allupdated@test.example.com");
      expect(body.countryJobPositionId).toBe(secondJobPositionId.toString());
      expect(body.firstName).toBe("Fully");
      expect(body.lastName).toBe("Updated");
    });

    it("should update updatedAt timestamp", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "timestamp@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Timestamp",
          lastName: "Test",
        },
      });

      const beforeUpdate = new Date();
      await new Promise((resolve) => setTimeout(resolve, 10));

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
  });

  describe("Partial updates", () => {
    it("should allow empty payload (no changes)", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "nochange@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "No",
          lastName: "Change",
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
