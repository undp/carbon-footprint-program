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
  createTestUser,
  getTestLoggedUser,
} from "@test/factories/userFactory.js";
import type { UpdateUserRoleResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { SystemRole } from "@repo/database/enums";

describe("PATCH /api/users/:id/role - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let loggedUser: Awaited<ReturnType<typeof getTestLoggedUser>>;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    loggedUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await prisma.userRoleAudit.deleteMany({
      where: { changedById: loggedUser.id },
    });
    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: loggedUser.role },
    });
    await prisma.user.deleteMany({
      where: { idpUserId: { startsWith: "test-idp-" } },
    });
  });

  const promoteLoggedUserToSuperadmin = async () => {
    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.SUPERADMIN },
    });
  };

  describe("Authorization", () => {
    it("returns 403 when actor is USER", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.USER },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 403 when actor is ADMIN", async () => {
      const target = await createTestUser(prisma, { role: SystemRole.USER });
      await prisma.user.update({
        where: { id: loggedUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("FORBIDDEN");
    });

    it("returns 403 SELF_ROLE_CHANGE when SUPERADMIN targets themselves", async () => {
      await promoteLoggedUserToSuperadmin();

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${loggedUser.id}/role`,
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as { code: string };
      expect(body.code).toBe("SELF_ROLE_CHANGE");
    });
  });

  describe("Successful role transitions", () => {
    it("promotes USER to ADMIN", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserRoleResponse;
      expect(body.role).toBe(SystemRole.ADMIN);
    });

    it("promotes USER to SUPERADMIN", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.SUPERADMIN },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserRoleResponse;
      expect(body.role).toBe(SystemRole.SUPERADMIN);
    });

    it("demotes ADMIN to USER", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.USER },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserRoleResponse;
      expect(body.role).toBe(SystemRole.USER);
    });

    it("demotes another SUPERADMIN when more than one exists", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, {
        role: SystemRole.SUPERADMIN,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateUserRoleResponse;
      expect(body.role).toBe(SystemRole.ADMIN);
    });
  });

  describe("Guards", () => {
    it("returns 200 with no audit row on no-op transition", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });

      const before = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
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
  });

  describe("Audit", () => {
    it("creates exactly one UserRoleAudit row on a successful change", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN },
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

    it("sets updatedById to the actor on a successful change", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.ADMIN });

      await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.USER },
      });

      const updated = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });
      expect(updated.updatedById?.toString()).toBe(loggedUser.id.toString());
    });

    it("rolls back the role update when the audit insert fails", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      // Force every insert into user_role_audit to fail at the database
      // level. NOT VALID skips validation of existing rows so this guard can
      // be attached regardless of prior table state.
      await prisma.$executeRawUnsafe(
        `ALTER TABLE user_role_audit ADD CONSTRAINT integration_test_force_audit_failure CHECK (id IS NULL) NOT VALID`
      );

      try {
        const response = await app.inject({
          method: "PATCH",
          url: `/api/users/${target.id}/role`,
          payload: { role: SystemRole.ADMIN },
        });

        expect(response.statusCode).not.toBe(200);
      } finally {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE user_role_audit DROP CONSTRAINT IF EXISTS integration_test_force_audit_failure`
        );
      }

      const after = await prisma.user.findUniqueOrThrow({
        where: { id: target.id },
      });
      expect(after.role).toBe(SystemRole.USER);
      expect(after.updatedById).toBeNull();

      const auditCount = await prisma.userRoleAudit.count({
        where: { userId: target.id },
      });
      expect(auditCount).toBe(0);
    });
  });

  describe("Schema validation", () => {
    it("returns 400 for invalid id format", async () => {
      await promoteLoggedUserToSuperadmin();

      const response = await app.inject({
        method: "PATCH",
        url: "/api/users/invalid-id/role",
        payload: { role: SystemRole.ADMIN },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for unknown body fields", async () => {
      await promoteLoggedUserToSuperadmin();
      const target = await createTestUser(prisma, { role: SystemRole.USER });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/users/${target.id}/role`,
        payload: { role: SystemRole.ADMIN, unknown: "field" },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
