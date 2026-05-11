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
import type { UpdateMagnitudeResponse } from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("PATCH /api/magnitudes/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let originalRole: SystemRole;
  let systemMagnitudeId: string;
  let originalSystemName: string;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
    originalRole = testUser.role;
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.ADMIN },
    });

    const massMagnitude = await prisma.magnitude.findUnique({
      where: { code: "mass" },
    });
    if (!massMagnitude) {
      throw new Error(
        "Test precondition failed: system magnitude 'mass' not found. Did the seed run?"
      );
    }
    systemMagnitudeId = massMagnitude.id.toString();
    originalSystemName = massMagnitude.name;
  });

  afterAll(async () => {
    // Restore the system magnitude's original name in case any test renamed it.
    await prisma.magnitude.update({
      where: { id: BigInt(systemMagnitudeId) },
      data: { name: originalSystemName },
    });
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
    await prisma.magnitude.update({
      where: { id: BigInt(systemMagnitudeId) },
      data: { name: originalSystemName },
    });
  });

  async function createCustomMagnitude(): Promise<{
    id: string;
    code: string;
  }> {
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const created = await prisma.magnitude.create({
      data: {
        code: `test_${suffix}`,
        name: `Test Update ${suffix}`,
        isSystem: false,
        status: MagnitudeStatus.ACTIVE,
      },
    });
    return { id: created.id.toString(), code: created.code };
  }

  describe("Authorization", () => {
    it("should return 403 for non-admin users", async () => {
      const target = await createCustomMagnitude();
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.USER },
      });
      try {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/magnitudes/${target.id}`,
          payload: { name: "Renamed" },
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

  describe("Successful update", () => {
    it("should rename a custom magnitude and return 200", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "Renamed Custom" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMagnitudeResponse;
      expect(body.id).toBe(target.id);
      expect(body.name).toBe("Renamed Custom");
      // Code is immutable.
      expect(body.code).toBe(target.code);
      expect(body.isSystem).toBe(false);
      expect(body.status).toBe(MagnitudeStatus.ACTIVE);
    });

    it("should rename a system magnitude (system magnitudes are relabelable)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${systemMagnitudeId}`,
        payload: { name: "Masa renombrada" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMagnitudeResponse;
      expect(body.id).toBe(systemMagnitudeId);
      expect(body.name).toBe("Masa renombrada");
      expect(body.code).toBe("mass"); // immutable
      expect(body.isSystem).toBe(true);
    });

    it("should trim whitespace around name", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "   Trimmed   " },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateMagnitudeResponse;
      expect(body.name).toBe("Trimmed");
    });
  });

  describe("Validation", () => {
    it("should return 400 when body contains `code`", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "Some name", code: "test_new_code" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when body contains `isSystem`", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "Some name", isSystem: true },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when body contains `status`", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "Some name", status: "DELETED" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name is missing", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name is empty (after trim)", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "   " },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when name exceeds MAGNITUDE_NAME_MAX_LENGTH", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "x".repeat(101) },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Not found", () => {
    it("should return 404 when the magnitude id does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/magnitudes/999999999",
        payload: { name: "Doesn't matter" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when the magnitude has been soft-deleted", async () => {
      const target = await createCustomMagnitude();
      await prisma.magnitude.update({
        where: { id: BigInt(target.id) },
        data: { status: MagnitudeStatus.DELETED },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/magnitudes/${target.id}`,
        payload: { name: "Should not apply" },
      });

      expect(response.statusCode).toBe(404);

      const stored = await prisma.magnitude.findUnique({
        where: { id: BigInt(target.id) },
      });
      expect(stored?.name).toBe(
        `Test Update ${target.code.replace("test_", "")}`
      );
      expect(stored?.status).toBe(MagnitudeStatus.DELETED);
    });
  });
});
