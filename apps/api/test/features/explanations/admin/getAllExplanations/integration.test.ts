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
import { EXPLANATION_CATALOG, ExplanationSlug } from "@repo/constants";
import type { GetAllExplanationsResponse } from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestExplanation,
  cleanupTestExplanations,
} from "@test/factories/explanationFactory.js";

describe("GET /api/admin/explanations - Integration Tests", () => {
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
        method: "GET",
        url: "/api/admin/explanations",
      });
      expect(response.statusCode).toBe(403);
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });
    }
  });

  it("returns rows in name ascending order for ADMIN", async () => {
    await createTestExplanation(prisma, {
      slug: ExplanationSlug.REDUCTION_PROJECTS_LIST,
      name: "Zeta",
      description: null,
      content: "z",
    });
    await createTestExplanation(prisma, {
      slug: ExplanationSlug.REDUCTION_PROJECT_BASIS,
      name: "Alfa",
      description: "alfa-desc",
      content: "a",
    });
    await createTestExplanation(prisma, {
      slug: ExplanationSlug.REDUCTION_PROJECT_GWP,
      name: "Delta",
      description: null,
      content: "d",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/explanations",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetAllExplanationsResponse;
    expect(body.map((row) => row.name)).toEqual(["Alfa", "Delta", "Zeta"]);
    const alfa = body.find((row) => row.name === "Alfa")!;
    expect(alfa.slug).toBe(ExplanationSlug.REDUCTION_PROJECT_BASIS);
    expect(alfa.description).toBe("alfa-desc");
    expect(alfa.content).toBe("a");

    for (const row of body) {
      expect(typeof row.createdAt).toBe("string");
      expect(Number.isNaN(Date.parse(row.createdAt))).toBe(false);
      if (row.updatedAt !== null) {
        expect(typeof row.updatedAt).toBe("string");
        expect(Number.isNaN(Date.parse(row.updatedAt))).toBe(false);
      }
      if (row.updatedById !== null) {
        expect(typeof row.updatedById).toBe("string");
      }
    }
  });

  it("excludes rows whose slug is not in EXPLANATION_CATALOG", async () => {
    await createTestExplanation(prisma, {
      slug: "orphan_slug_not_in_catalog",
      name: "Orphan",
      content: "orphan-content",
    });

    const catalogSlug = ExplanationSlug.REDUCTION_PROJECT_GEI_CONSIDERED;
    await createTestExplanation(prisma, {
      slug: catalogSlug,
      name: EXPLANATION_CATALOG[catalogSlug].name,
      description: EXPLANATION_CATALOG[catalogSlug].description ?? null,
      content: "hello",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/explanations",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetAllExplanationsResponse;
    expect(body).toHaveLength(1);
    expect(body[0].slug).toBe(catalogSlug);
  });
});
