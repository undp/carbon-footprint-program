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
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

describe("DELETE /api/magnitudes/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;
  let originalRole: SystemRole;
  let systemMagnitudeId: string;

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
    // Clean up test units first (FK to magnitude) then test magnitudes.
    await prisma.rateMeasurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "kg/test_" } },
    });
    await prisma.measurementUnit.deleteMany({
      where: { abbreviation: { startsWith: "test_" } },
    });
    await prisma.magnitude.deleteMany({
      where: { code: { startsWith: "test_" } },
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
        name: `Test Delete ${suffix}`,
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
          method: "DELETE",
          url: `/api/magnitudes/${target.id}`,
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

  describe("Happy path", () => {
    it("should soft-delete a custom magnitude with no MU references and return 200", async () => {
      const target = await createCustomMagnitude();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/magnitudes/${target.id}`,
      });

      expect(response.statusCode).toBe(200);

      const row = await prisma.magnitude.findUnique({
        where: { id: BigInt(target.id) },
      });
      expect(row).not.toBeNull();
      expect(row!.status).toBe(MagnitudeStatus.DELETED);
    });

    it("should leave the magnitude queryable when status filter is excluded", async () => {
      const target = await createCustomMagnitude();

      await app.inject({
        method: "DELETE",
        url: `/api/magnitudes/${target.id}`,
      });

      // Status-agnostic lookup must still find the row (soft-delete, not hard).
      const row = await prisma.magnitude.findUnique({
        where: { id: BigInt(target.id) },
      });
      expect(row).not.toBeNull();
      expect(row!.code).toBe(target.code);
      expect(row!.status).toBe(MagnitudeStatus.DELETED);
    });
  });

  describe("Blocked operations", () => {
    it("should return 422 when the magnitude is referenced by an MU", async () => {
      const target = await createCustomMagnitude();
      const suffix = target.code.replace(/^test_/, "");

      await prisma.measurementUnit.create({
        data: {
          name: `Test MU ${suffix}`,
          abbreviation: `test_${suffix}`,
          magnitudeId: BigInt(target.id),
          baseFactor: 1,
          isBase: true,
        },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/magnitudes/${target.id}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAGNITUDE_REFERENCED");

      // The magnitude must remain ACTIVE after the rejected delete.
      const row = await prisma.magnitude.findUnique({
        where: { id: BigInt(target.id) },
      });
      expect(row!.status).toBe(MagnitudeStatus.ACTIVE);
    });

    it("should return 422 for a system magnitude regardless of references", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: `/api/magnitudes/${systemMagnitudeId}`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("MAGNITUDE_IS_SYSTEM");
    });
  });

  describe("Not found", () => {
    it("should return 404 for an unknown id", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/magnitudes/999999999",
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 404 when deleting an already soft-deleted magnitude (idempotent-not-found)", async () => {
      const target = await createCustomMagnitude();

      await prisma.magnitude.update({
        where: { id: BigInt(target.id) },
        data: { status: MagnitudeStatus.DELETED },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/magnitudes/${target.id}`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
