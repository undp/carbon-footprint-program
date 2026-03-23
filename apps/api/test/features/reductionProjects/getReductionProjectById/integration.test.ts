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
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createTestReductionProjectReport,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/reduction-projects/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let organizationId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestReductionProjects(prisma);
    await cleanupTestOrganization(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestReductionProjects(prisma);
  });

  describe("Happy path", () => {
    it("should return a project by ID with reports and files arrays", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionProjectByIdResponse;
      expect(body.id).toBe(project.id.toString());
      expect(body.name).toBe(project.name);
      expect(Array.isArray(body.reports)).toBe(true);
      expect(Array.isArray(body.files)).toBe(true);
    });

    it("should include reports in the response", async () => {
      const project = await createTestReductionProject(prisma, organizationId);
      await createTestReductionProjectReport(prisma, project.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionProjectByIdResponse;
      expect(body.reports).toHaveLength(1);
      expect(body.reports[0].reductionYear).toBe(2024);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/99999999",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_FOUND");
    });

    it("should return 400 when ID is not a valid number", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
