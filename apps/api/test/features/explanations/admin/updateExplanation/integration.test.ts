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
import { ExplanationSlug } from "@repo/constants";
import type { UpdateExplanationResponse } from "@repo/types";
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
        url: `/api/admin/explanations/${ExplanationSlug.REDUCTION_PROJECT_GWP}`,
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

  it("returns 404 when slug is not in the catalog", async () => {
    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/explanations/does_not_exist",
      payload: { content: "anything" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when slug exists in DB but not in EXPLANATION_CATALOG", async () => {
    await createTestExplanation(prisma, {
      slug: "orphan_slug_not_in_catalog",
      name: "Orphan",
      content: "old",
    });

    const response = await app.inject({
      method: "PATCH",
      url: "/api/admin/explanations/orphan_slug_not_in_catalog",
      payload: { content: "new" },
    });
    expect(response.statusCode).toBe(404);
  });

  it("returns 400 when content exceeds the max length", async () => {
    await createTestExplanation(prisma, {
      slug: ExplanationSlug.REDUCTION_PROJECT_GWP,
      name: "GWP",
      content: "",
    });

    const tooLong = "x".repeat(10_001);
    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/explanations/${ExplanationSlug.REDUCTION_PROJECT_GWP}`,
      payload: { content: tooLong },
    });
    expect(response.statusCode).toBe(400);
  });

  it("accepts an empty content string", async () => {
    await createTestExplanation(prisma, {
      slug: ExplanationSlug.REDUCTION_PROJECT_BASIS,
      name: "Basis",
      content: "non-empty",
    });

    const response = await app.inject({
      method: "PATCH",
      url: `/api/admin/explanations/${ExplanationSlug.REDUCTION_PROJECT_BASIS}`,
      payload: { content: "" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as UpdateExplanationResponse;
    expect(body.content).toBe("");
  });

  it("updates content, updatedById and updatedAt on the happy path", async () => {
    const slug = ExplanationSlug.REDUCTION_PROJECT_GWP;
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
    const body = JSON.parse(response.body) as UpdateExplanationResponse;
    expect(body.slug).toBe(slug);
    expect(body.content).toBe("New markdown");
    expect(body.updatedById).toBe(testUser.id.toString());
    expect(body.updatedAt).not.toBeNull();
    if (before.updatedAt) {
      expect(new Date(body.updatedAt!).getTime()).toBeGreaterThan(
        before.updatedAt.getTime()
      );
    }

    const persisted = await prisma.explanation.findUnique({ where: { slug } });
    expect(persisted?.content).toBe("New markdown");
    expect(persisted?.updatedById).toBe(testUser.id);
  });
});
