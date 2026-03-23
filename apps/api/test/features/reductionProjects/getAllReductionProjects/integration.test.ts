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
import type { GetAllReductionProjectsResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createTestReductionProjectReport,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import { VALIDATION_ERROR_CODE, type ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/reduction-projects - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let organizationId: string;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    organizationId = org.id.toString();
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
    it("should return empty array when no projects exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it("should return projects for the given organization", async () => {
      const project = await createTestReductionProject(
        prisma,
        BigInt(organizationId)
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe(project.id.toString());
      expect(body[0].name).toBe(project.name);
    });

    it("should include firstReportDate when project has reports", async () => {
      const project = await createTestReductionProject(
        prisma,
        BigInt(organizationId)
      );
      await createTestReductionProjectReport(prisma, project.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body[0].firstReportDate).toBeTruthy();
    });

    it("should return null firstReportDate when project has no reports", async () => {
      await createTestReductionProject(prisma, BigInt(organizationId));

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body[0].firstReportDate).toBeNull();
    });

    it("should filter by status", async () => {
      await createTestReductionProject(prisma, BigInt(organizationId), {
        status: "DRAFT",
      });
      await createTestReductionProject(prisma, BigInt(organizationId), {
        name: "In Review Project",
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects?organizationId=${organizationId}&status=DRAFT`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllReductionProjectsResponse;
      expect(body.every((p) => p.status === "DRAFT")).toBe(true);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when organizationId is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
