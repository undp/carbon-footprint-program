import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { MagnitudeStatus, SystemRole } from "@repo/database";
import {
  MagnitudeCreationActionEnum,
  type CreateMagnitudeResponse,
} from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("POST /api/magnitudes - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let originalRole: SystemRole;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.ADMIN },
    });
  });

  afterAll(async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: originalRole },
    });
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.magnitude.deleteMany({
      where: { code: { startsWith: "test_" } },
    });
  });

  function buildPayload(overrides?: Record<string, unknown>) {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return {
      code: `test_${suffix}`,
      name: `Test Magnitude ${suffix}`,
      ...overrides,
    };
  }

  describe("Authorization", () => {
    it("should return 403 for non-admin users", async () => {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/magnitudes",
          payload: buildPayload(),
        });
        expect(response.statusCode).toBe(403);
      } finally {
        await prisma.user.update({
          where: { id: testUser.id },
          data: { role: SystemRole.ADMIN },
        });
      }
    });
  });

  describe("Successful creation", () => {
    it("should create a magnitude and return 201", async () => {
      const payload = buildPayload();

      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMagnitudeResponse;
      expect(body.id).toBeTruthy();
      expect(body.code).toBe(payload.code);
      expect(body.name).toBe(payload.name);
      expect(body.isSystem).toBe(false);
      expect(body.status).toBe(MagnitudeStatus.ACTIVE);
      expect(body.referenceCount).toBe(0);
      expect(body.action).toBe(MagnitudeCreationActionEnum.created);
    });

    it("should trim whitespace around code and name", async () => {
      const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: {
          code: `  test_${suffix}  `,
          name: `  Trimmed Test ${suffix}  `,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMagnitudeResponse;
      expect(body.code).toBe(`test_${suffix}`);
      expect(body.name).toBe(`Trimmed Test ${suffix}`);
    });
  });

  describe("Conflict handling", () => {
    it("should return 409 when code matches an ACTIVE custom magnitude", async () => {
      const payload = buildPayload();

      const first = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload,
      });
      expect(first.statusCode).toBe(201);

      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAGNITUDE_CODE_ALREADY_EXISTS");
    });

    it("should return 409 when code matches an ACTIVE system magnitude", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: { code: "mass", name: "Should not collide" },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAGNITUDE_CODE_ALREADY_EXISTS");
    });
  });

  describe("Restore after soft-delete", () => {
    it("should restore a soft-deleted custom magnitude with action=fullyRestored", async () => {
      const payload = buildPayload();

      const createResponse = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload,
      });
      const created = JSON.parse(
        createResponse.body
      ) as CreateMagnitudeResponse;

      // Soft-delete directly in DB (the delete endpoint requires
      // referenceCount = 0 which we already satisfy, but going through DB
      // keeps the test scoped to the create endpoint).
      await prisma.magnitude.update({
        where: { id: BigInt(created.id) },
        data: { status: MagnitudeStatus.DELETED },
      });

      const restorePayload = {
        code: payload.code,
        name: `Restored ${payload.name}`,
      };

      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: restorePayload,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateMagnitudeResponse;
      expect(body.action).toBe(MagnitudeCreationActionEnum.fullyRestored);
      expect(body.id).toBe(created.id);
      expect(body.code).toBe(payload.code);
      expect(body.name).toBe(restorePayload.name);
      expect(body.status).toBe(MagnitudeStatus.ACTIVE);
      expect(body.isSystem).toBe(false);
    });
  });

  describe("Validation", () => {
    it("should return 400 when code is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: { name: "missing code" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: { code: "test_missing_name" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for an uppercase code", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: buildPayload({ code: "TEST_UPPERCASE" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for a code with invalid characters (hyphen)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: buildPayload({ code: "test-invalid" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for a code starting with a digit", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: buildPayload({ code: "3d_objects" }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when the name exceeds MAGNITUDE_NAME_MAX_LENGTH", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: buildPayload({ name: "x".repeat(101) }),
      });
      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for an empty name (after trim)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/magnitudes",
        payload: buildPayload({ name: "   " }),
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
