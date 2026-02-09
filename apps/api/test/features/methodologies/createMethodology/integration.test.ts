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
import type { CreateMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";

describe("POST /api/methodologies - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.methodologyVersion.deleteMany({
      where: { name: { startsWith: "Test - " } },
    });
  });

  describe("Successful creation", () => {
    it("should create a new methodology and return 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - New Methodology",
          description: "A test methodology description",
          regulation: "Test Regulation",
          version: "1.0",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMethodologyResponse;

      expect(body.id).toBeTruthy();
      expect(body.name).toBe("Test - New Methodology");
      expect(body.description).toBe("A test methodology description");
      expect(body.regulation).toBe("Test Regulation");
      expect(body.version).toBe("1.0");
      expect(body.status).toBe("UNPUBLISHED");
      expect(body.countryId).toBeTruthy();
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();
    });

    it("should persist the methodology in the database", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - DB Verify Methodology",
          description: "Verify in DB",
          regulation: "Regulation",
          version: "2.0",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMethodologyResponse;

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(body.id) },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord!.name).toBe("Test - DB Verify Methodology");
      expect(dbRecord!.status).toBe(MethodologyVersionStatus.UNPUBLISHED);
    });

    it("should set createdAt and updatedAt timestamps", async () => {
      const beforeCreate = new Date();

      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - Timestamps Methodology",
          description: "Test timestamps",
          regulation: "Regulation",
          version: "1.0",
        },
      });

      const afterCreate = new Date();

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMethodologyResponse;

      const createdAt = new Date(body.createdAt);
      const updatedAt = new Date(body.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          description: "No name",
          regulation: "Regulation",
          version: "1.0",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when description is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - No Description",
          regulation: "Regulation",
          version: "1.0",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when regulation is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - No Regulation",
          description: "Description",
          version: "1.0",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when version is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - No Version",
          description: "Description",
          regulation: "Regulation",
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Duplicate handling", () => {
    it("should return 409 when name already exists for the same country", async () => {
      // Create the first methodology
      await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - Duplicate Name",
          description: "First",
          regulation: "Regulation",
          version: "1.0",
        },
      });

      // Try to create another with the same name
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - Duplicate Name",
          description: "Second",
          regulation: "Regulation",
          version: "2.0",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NAME_ALREADY_EXISTS");
    });
  });
});
