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
import type { PrismaClient } from "@repo/database";
import type { GetExplanationBySlugResponse } from "@repo/types";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  createTestExplanation,
  cleanupTestExplanations,
} from "@test/factories/explanationFactory.js";

describe("GET /api/explanations/:slug - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp(inject("databaseUrl"));
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestExplanations(prisma);
  });

  it("returns 200 with the explanation content for an existing slug", async () => {
    await createTestExplanation(prisma, {
      slug: "test-existing-slug",
      name: "Existing Explanation",
      content: "Contenido de prueba",
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/explanations/test-existing-slug",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetExplanationBySlugResponse;
    expect(body).toEqual({
      slug: "test-existing-slug",
      content: "Contenido de prueba",
    });
  });

  it("returns 404 with EXPLANATION_NOT_FOUND for an unknown slug", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/explanations/does-not-exist-slug",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("EXPLANATION_NOT_FOUND");
  });
});
