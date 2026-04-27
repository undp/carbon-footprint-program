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

  it("returns rows in name ascending order with the slim shape", async () => {
    await createTestExplanation(prisma, {
      slug: "reduction_projects_list",
      name: "Zeta",
      description: null,
      content: "z",
    });
    await createTestExplanation(prisma, {
      slug: "reduction_project_basis",
      name: "Alfa",
      description: "alfa-desc",
      content: "a",
    });
    await createTestExplanation(prisma, {
      slug: "reduction_project_gwp",
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
    expect(alfa).toEqual({
      slug: "reduction_project_basis",
      name: "Alfa",
      description: "alfa-desc",
      content: "a",
    });
  });
});
