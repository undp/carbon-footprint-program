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
import { SystemRole } from "@repo/database";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestExplanation,
  cleanupTestExplanations,
} from "@test/factories/explanationFactory.js";

describe("PATCH /api/admin/explanations/:slug - Integration Tests", () => {
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
    await cleanupTestExplanations(prisma);
  });

  it("returns 403 for non-admin users", async () => {
    await prisma.user.update({
      where: { id: testUser.id },
      data: { role: SystemRole.USER },
    });
    try {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/admin/explanations/reduction_project_gwp",
        payload: { content: "x" },
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });
    }
  });

  it("returns 404 when no row exists for the given slug", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/explanations/does_not_exist",
      payload: { content: "anything" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 400 when content exceeds the max length", async () => {
    await createTestExplanation(prisma, {
      slug: "reduction_project_gwp",
      name: "GWP",
      content: "",
    });

    const tooLong = "x".repeat(10_001);
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/explanations/reduction_project_gwp",
      payload: { content: tooLong },
    });
    expect(response.statusCode).toBe(400);
  });

  it("accepts an empty content string and returns an empty body", async () => {
    await createTestExplanation(prisma, {
      slug: "reduction_project_basis",
      name: "Basis",
      content: "non-empty",
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/explanations/reduction_project_basis",
      payload: { content: "" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({});
    const persisted = await prisma.explanation.findUnique({
      where: { slug: "reduction_project_basis" },
    });
    expect(persisted?.content).toBe("");
  });

  it("persists content, updatedById and updatedAt on the happy path", async () => {
    const slug = "reduction_project_gwp";
    const before = await createTestExplanation(prisma, {
      slug,
      name: "GWP",
      content: "old",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/explanations/${slug}`,
      payload: { content: "New markdown" },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({});

    const persisted = await prisma.explanation.findUnique({ where: { slug } });
    expect(persisted?.content).toBe("New markdown");
    expect(persisted?.updatedById).toBe(testUser.id);
    if (before.updatedAt && persisted?.updatedAt) {
      expect(persisted.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime()
      );
    }
  });
});
