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
import { restoreMethodologies } from "@test/factories/methodologyCleaner.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { CreateMethodologyResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { MethodologyVersionStatus } from "@repo/database";
import { createMethodologyService } from "@/features/methodologies/createMethodology/service.js";
import { NoCountryFoundError } from "@/features/methodologies/errors.js";
import { mapUserToResponse } from "@/features/users/mappers.js";

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

  afterEach(async () => {
    await restoreMethodologies(prisma);
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
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeNull();
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

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreate.getTime()
      );
      expect(createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
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

    it("should return 400 when name is empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "",
          description: "Name is empty",
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

    it("should return 400 when regulation is empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Name",
          description: "Description",
          regulation: "",
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

    it("should return 400 when version is empty string", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Name",
          description: "Description",
          regulation: "Regulation",
          version: "",
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
    it("should return 409 when name and version already exists for the same country", async () => {
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

      // Try to create another with the same name and version
      const response = await app.inject({
        method: "POST",
        url: "/api/methodologies",
        payload: {
          name: "Test - Duplicate Name",
          description: "Second",
          regulation: "Regulation",
          version: "1.0",
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as {
        code: string;
        message: string;
      };
      expect(body.code).toBe("METHODOLOGY_NAME_VERSION_ALREADY_EXISTS");
    });
  });

  describe("Service-level edge cases (not reachable via HTTP)", () => {
    it("should set createdById to null when creating without an authenticated user", async () => {
      const response = await createMethodologyService(
        prisma,
        {
          name: "Test - No User Create",
          description: "Created with no user",
          regulation: "Regulation",
          version: "1.0",
        },
        null
      );

      const dbRecord = await prisma.methodologyVersion.findUnique({
        where: { id: BigInt(response.id) },
      });
      expect(dbRecord!.createdById).toBeNull();
    });

    it("should throw NoCountryFoundError when the database has no country", async () => {
      // The `country` table is always seeded in every real deployment; this
      // guard is a defensive check that cannot be reached through the seeded
      // test database without deleting all countries (which would cascade
      // through unrelated seeded data). A minimal stub standing in for the one
      // call the service makes before any mutation exercises the guard in
      // isolation, without touching the real DB.
      const stubPrisma = {
        country: { findFirst: () => Promise.resolve(null) },
      } as unknown as PrismaClient;

      await expect(
        createMethodologyService(
          stubPrisma,
          {
            name: "Test - No Country",
            description: "desc",
            regulation: "reg",
            version: "1.0",
          },
          null
        )
      ).rejects.toThrow(NoCountryFoundError);
    });

    it("should rethrow a non-duplicate database error unchanged (foreign key violation)", async () => {
      const testUser = await getTestLoggedUser(prisma);
      const bogusUser = {
        ...mapUserToResponse(testUser),
        id: "999999999999",
      };

      await expect(
        createMethodologyService(
          prisma,
          {
            name: "Test - FK Violation Create",
            description: "desc",
            regulation: "reg",
            version: "1.0",
          },
          bogusUser
        )
      ).rejects.toThrow();

      // Cleanup in case the row was somehow created (it should not be).
      await prisma.methodologyVersion.deleteMany({
        where: { name: "Test - FK Violation Create" },
      });
    });

    it("should rethrow a non-Prisma error unchanged when the user id cannot be converted to BigInt", async () => {
      // `BigInt(user.id)` is the very first statement inside the try block,
      // before any Prisma call is made. An invalid numeric string makes it
      // throw a native `SyntaxError`, which is not a
      // `Prisma.PrismaClientKnownRequestError`, so the catch block's
      // `instanceof` check is false and the raw error is rethrown unchanged.
      const testUser = await getTestLoggedUser(prisma);
      const bogusUser = {
        ...mapUserToResponse(testUser),
        id: "not-a-number",
      };

      await expect(
        createMethodologyService(
          prisma,
          {
            name: "Test - Bad User Id Create",
            description: "desc",
            regulation: "reg",
            version: "1.0",
          },
          bogusUser
        )
      ).rejects.toThrow(SyntaxError);
    });
  });
});
