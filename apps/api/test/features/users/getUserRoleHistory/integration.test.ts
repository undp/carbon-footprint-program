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
import type { GetUserRoleHistoryResponse } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import { SystemRole } from "@repo/database/enums";

describe("GET /api/users/:id/role-history - Integration Tests", () => {
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
    await prisma.user.deleteMany({
      where: { idpUserId: { startsWith: "test-idp-" } },
    });
  });

  it("4b.2 ADMIN can read history (200, ordered DESC, includes actor display fields)", async () => {
    const target = await createTestUser(prisma, { role: SystemRole.USER });
    const superadminRole = loggedUser.role;

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.SUPERADMIN },
    });

    await prisma.userRoleAudit.create({
      data: {
        userId: target.id,
        previousRole: SystemRole.USER,
        newRole: SystemRole.ADMIN,
        changedById: loggedUser.id,
      },
    });
    await prisma.userRoleAudit.create({
      data: {
        userId: target.id,
        previousRole: SystemRole.ADMIN,
        newRole: SystemRole.SUPERADMIN,
        changedById: loggedUser.id,
      },
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.ADMIN },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/users/${target.id}/role-history`,
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: superadminRole },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetUserRoleHistoryResponse;
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);

    const first = body[0];
    expect(first.changedBy).toBeDefined();
    expect(first.changedBy.id).toBe(loggedUser.id.toString());
    expect(typeof first.changedBy.firstName).toBe("string");
    expect(first.previousRole).toBeDefined();
    expect(first.newRole).toBeDefined();
    expect(new Date(body[0].createdAt) >= new Date(body[1].createdAt)).toBe(
      true
    );
  });

  it("4b.3 SUPERADMIN can read history (200)", async () => {
    const target = await createTestUser(prisma, { role: SystemRole.USER });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.SUPERADMIN },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/users/${target.id}/role-history`,
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: loggedUser.role },
    });

    expect(response.statusCode).toBe(200);
  });

  it("4b.4 USER receives 403", async () => {
    const target = await createTestUser(prisma, { role: SystemRole.USER });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.USER },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/users/${target.id}/role-history`,
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: loggedUser.role },
    });

    expect(response.statusCode).toBe(403);
  });

  it.skip("4b.5 unauthenticated request receives 401", () => {
    // Tests run with AUTH_PROVIDER=forced-user, which always resolves a
    // pre-seeded user regardless of the Authorization header, so an
    // "unauthenticated" request cannot be simulated through `app.inject` in
    // this environment. The 401 path is exercised by the authentication
    // plugin's own unit tests.
  });

  it("4b.6 empty array when target user id does not exist", async () => {
    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.ADMIN },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/users/999999999999/role-history",
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: loggedUser.role },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetUserRoleHistoryResponse;
    expect(body).toHaveLength(0);
  });

  it("4b.7 empty array when target user has no recorded transitions", async () => {
    const target = await createTestUser(prisma, { role: SystemRole.USER });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: SystemRole.ADMIN },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/users/${target.id}/role-history`,
    });

    await prisma.user.update({
      where: { id: loggedUser.id },
      data: { role: loggedUser.role },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetUserRoleHistoryResponse;
    expect(body).toHaveLength(0);
  });
});
