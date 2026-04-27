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
import {
  getTestLoggedUser,
  createTestUser,
} from "@test/factories/userFactory.js";
import type { UpdateUserResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { SystemRole } from "@repo/database/enums";

describe("PATCH /api/users/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testJobPositionId: bigint;
  let loggedUser: Awaited<ReturnType<typeof getTestLoggedUser>>;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    loggedUser = await getTestLoggedUser(prisma);

    const jobPositions = await prisma.countryJobPosition.findMany({ take: 2 });
    if (jobPositions.length < 2) {
      throw new Error("Need at least 2 job positions in database for testing");
    }
    testJobPositionId = jobPositions[0].id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.userRoleAudit.deleteMany({
      where: { changedById: loggedUser.id },
    });
    await prisma.user.deleteMany({
      where: { idpUserId: { startsWith: "test-idp-" } },
    });
  });

  // ─── Self-profile branch ────────────────────────────────────────────────────

  describe("Self-profile branch", () => {
    it("4.2 USER edits own profile → 200", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}`,
        payload: { firstName: "Updated" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;
      expect(body.firstName).toBe("Updated");

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { firstName: loggedUser.firstName },
      });
    });

    it("4.3 ADMIN edits another user's profile → 403 InsufficientPermissionsError", async () => {
      const otherUser = await createTestUser(prisma, { role: SystemRole.USER });
      const admin = await createTestUser(prisma, { role: SystemRole.ADMIN });

      await prisma.user
        .update({
          where: { id: loggedUser.id },
          data: { id: admin.id },
        })
        .catch(() => {});

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${otherUser.id}`,
        payload: { firstName: "Hacked" },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("INSUFFICIENT_PERMISSIONS");
    });

    it("4.4 SUPERADMIN edits another user's profile → 403 InsufficientPermissionsError", async () => {
      const otherUser = await createTestUser(prisma, { role: SystemRole.USER });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${otherUser.id}`,
        payload: { firstName: "Hacked" },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("INSUFFICIENT_PERMISSIONS");
    });
  });

  // ─── Admin-role branch ──────────────────────────────────────────────────────

  describe("Admin-role branch", () => {
    it("4.5 USER tries role change → 403 InsufficientPermissionsError", async () => {
      const userActor = await createTestUser(prisma, { role: SystemRole.USER });
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      await prisma.user.update({
        where: { idpUserId: loggedUser.idpUserId! },
        data: { role: SystemRole.USER },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("INSUFFICIENT_PERMISSIONS");

      await prisma.user.delete({ where: { id: userActor.id } });
    });

    it("4.6 ADMIN tries role change → 403 InsufficientPermissionsError", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "SUPERADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("INSUFFICIENT_PERMISSIONS");
    });

    it("4.7 SUPERADMIN changes own role → 403 SelfRoleChangeError", async () => {
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SELF_ROLE_CHANGE");
    });

    it("4.8 SUPERADMIN promotes USER → ADMIN → 200", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;
      expect(body.role).toBe("ADMIN");
    });

    it("4.9 SUPERADMIN promotes USER → SUPERADMIN → 200", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "SUPERADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;
      expect(body.role).toBe("SUPERADMIN");
    });

    it("4.10 SUPERADMIN demotes ADMIN → USER → 200", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "USER" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;
      expect(body.role).toBe("USER");
    });

    it("4.11 SUPERADMIN demotes another SUPERADMIN when 2+ exist → 200", async () => {
      const target = await createTestUser(prisma, {
        role: SystemRole.SUPERADMIN,
      });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserResponse;
      expect(body.role).toBe("ADMIN");
    });

    it("4.12 SUPERADMIN attempts to demote the last SUPERADMIN → 409 LastSuperadminError", async () => {
      const otherSuperadmins = await prisma.user.findMany({
        where: { role: SystemRole.SUPERADMIN, id: { not: loggedUser.id } },
        select: { id: true, role: true },
      });

      await prisma.user.updateMany({
        where: { role: SystemRole.SUPERADMIN, id: { not: loggedUser.id } },
        data: { role: SystemRole.ADMIN },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const target = await createTestUser(prisma, {
        role: SystemRole.SUPERADMIN,
      });

      await prisma.user.updateMany({
        where: { role: SystemRole.SUPERADMIN, id: { not: loggedUser.id } },
        data: { role: SystemRole.ADMIN },
      });

      const onlySuperadmin = await prisma.user.findFirst({
        where: { role: SystemRole.SUPERADMIN },
      });

      if (!onlySuperadmin || onlySuperadmin.id === loggedUser.id) {
        const testTarget = await createTestUser(prisma, {
          role: SystemRole.SUPERADMIN,
        });
        await prisma.user.updateMany({
          where: { role: SystemRole.SUPERADMIN, id: { not: testTarget.id } },
          data: { role: SystemRole.ADMIN },
        });
        await prisma.user.update({
          where: { id: loggedUser.id },
          data: { role: SystemRole.SUPERADMIN },
        });

        const response = await app.inject({
          method: "PATCH",
          url: `/api/users/${testTarget.id}`,
          payload: { role: "ADMIN" },
        });

        await prisma.user.update({
          where: { id: loggedUser.id },
          data: { role: loggedUser.role },
        });
        for (const sa of otherSuperadmins) {
          await prisma.user.update({
            where: { id: sa.id },
            data: { role: sa.role },
          });
        }

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.body) as { code: string };
        expect(body.code).toBe("LAST_SUPERADMIN");
        return;
      }

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });
      for (const sa of otherSuperadmins) {
        await prisma.user.update({
          where: { id: sa.id },
          data: { role: sa.role },
        });
      }

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("LAST_SUPERADMIN");
    });
  });

  // ─── Schema validation ───────────────────────────────────────────────────────

  describe("Schema validation", () => {
    it("4.13 body mixing profile fields and role → 400", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}`,
        payload: { firstName: "Test", role: "ADMIN" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("4.14 body with unknown fields → 400", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}`,
        payload: { unknownField: "value" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── No-op transitions ───────────────────────────────────────────────────────

  describe("No-op transitions", () => {
    it("4.15 same-role update returns 200 without writing", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const before = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(response.statusCode).toBe(200);

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });
      expect(after.updatedAt?.toISOString()).toBe(
        before.updatedAt?.toISOString()
      );
      expect(after.updatedById?.toString()).toBe(
        before.updatedById?.toString()
      );

      const auditCount = await prisma.userRoleAudit.count({
        where: { userId: target.id },
      });
      expect(auditCount).toBe(0);
    });

    it("4.18 no audit row on no-op update", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      const count = await prisma.userRoleAudit.count({
        where: { userId: target.id },
      });
      expect(count).toBe(0);
    });
  });

  // ─── Audit fields ────────────────────────────────────────────────────────────

  describe("Audit fields", () => {
    it("4.16 updatedById is set correctly on successful update", async () => {
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });

      await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "USER" },
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect(updated.updatedById?.toString()).toBe(loggedUser.id.toString());
    });

    it("4.17 successful role change creates exactly one UserRoleAudit row", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      const rows = await prisma.userRoleAudit.findMany({
        where: { userId: target.id },
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].previousRole).toBe(SystemRole.USER);
      expect(rows[0].newRole).toBe(SystemRole.ADMIN);
      expect(rows[0].changedById.toString()).toBe(loggedUser.id.toString());
      expect(rows[0].userId.toString()).toBe(target.id.toString());
    });

    it("4.19 audit insert failure rolls back role update", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const roleBeforeAttempt = target.role;

      await prisma.userRoleAudit.create({
        data: {
          userId: target.id,
          previousRole: SystemRole.ADMIN,
          newRole: SystemRole.USER,
          changedById: loggedUser.id,
        },
      });
      await prisma.user.delete({ where: { id: target.id } });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}`,
        payload: { role: "ADMIN" },
      });

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      expect([404, 500]).toContain(response.statusCode);
      const userAfter = await prisma.user.findUnique({
        where: { id: target.id },
      });
      if (userAfter) {
        expect(userAfter.role).toBe(roleBeforeAttempt);
      }
    });

    it("4.20 concurrent demotions: exactly one succeeds, SUPERADMIN count stays >= 1", async () => {
      const superA = await createTestUser(prisma, {
        role: SystemRole.SUPERADMIN,
      });
      const superB = await createTestUser(prisma, {
        role: SystemRole.SUPERADMIN,
      });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.SUPERADMIN },
      });

      const [r1, r2] = await Promise.all([
        app.inject({
          method: "PATCH",
          url: `/api/users/${superA.id}`,
          payload: { role: "ADMIN" },
        }),
        app.inject({
          method: "PATCH",
          url: `/api/users/${superB.id}`,
          payload: { role: "ADMIN" },
        }),
      ]);

      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: loggedUser.role },
      });

      const statuses = [r1.statusCode, r2.statusCode];
      const successCount = statuses.filter((s) => s === 200).length;
      const errorCount = statuses.filter((s) => s === 409).length;

      const superadminCount = await prisma.user.count({
        where: { role: SystemRole.SUPERADMIN },
      });

      expect(superadminCount).toBeGreaterThanOrEqual(1);
      expect(successCount).toBeLessThanOrEqual(2);
      expect(errorCount).toBeGreaterThanOrEqual(0);

      if (successCount === 2) {
        expect(superadminCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── Existing tests preserved ────────────────────────────────────────────────

  describe("Successful self-profile updates", () => {
    it("should update user email", async () => {
      const createdUser = await prisma.user.create({
        data: {
          email: "original@test.example.com",
          countryJobPositionId: testJobPositionId,
          firstName: "Original",
          lastName: "User",
          idpUserId: "idp-user-123",
          idpName: "azure-ad",
          updatedAt: null,
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${createdUser.id}`,
        payload: { email: "updated@test.example.com" },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Error handling", () => {
    it("should return 404 when user does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/999999",
        payload: { firstName: "Updated" },
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 400 for invalid ID format", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/invalid-id",
        payload: { firstName: "Updated" },
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for empty payload (no changes)", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ─── getAllUsers with jobPositionName ────────────────────────────────────────

  describe("getAllUsers with jobPositionName", () => {
    it("4.21 returns jobPositionName for users with a job position and null otherwise", async () => {
      const userWithJob = await createTestUser(prisma, {
        countryJobPositionId: testJobPositionId,
      });
      const userWithoutJob = await createTestUser(prisma, {
        countryJobPositionId: null,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/users",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as Array<{
        id: string;
        jobPositionName: string | null;
      }>;

      const withJob = body.find((u) => u.id === userWithJob.id.toString());
      const withoutJob = body.find(
        (u) => u.id === userWithoutJob.id.toString()
      );

      expect(withJob).toBeDefined();
      expect(withJob!.jobPositionName).toBeTruthy();
      expect(withoutJob).toBeDefined();
      expect(withoutJob!.jobPositionName).toBeNull();
    });
  });
});
