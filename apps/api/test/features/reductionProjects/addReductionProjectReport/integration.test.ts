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
import type { AddReductionProjectReportResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createTestReductionProjectReport,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/reports - Integration Tests", () => {
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
    it("should add a report and return the full project", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: {
          reductionYear: 2024,
          baselineValue: 10000,
          projectValue: 7000,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddReductionProjectReportResponse;
      expect(body.id).toBe(project.id.toString());
      expect(body.reports).toHaveLength(1);
      expect(body.reports[0].reductionYear).toBe(2024);
      expect(body.reports[0].baselineValue).toBe(10000);
      expect(body.reports[0].projectValue).toBe(7000);
      expect(body.reports[0].reductionValue).toBe(3000);
    });

    it("should allow multiple reports for different years", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 2023, baselineValue: 8000, projectValue: 5000 },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 2024, baselineValue: 10000, projectValue: 7000 },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as AddReductionProjectReportResponse;
      expect(body.reports).toHaveLength(2);
    });
  });

  describe("Error cases", () => {
    it("should return 409 when a report for the same year already exists", async () => {
      const project = await createTestReductionProject(prisma, organizationId);
      await createTestReductionProjectReport(prisma, project.id, {
        reductionYear: 2024,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 2024, baselineValue: 5000, projectValue: 3000 },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("DUPLICATE_REPORT_YEAR");
    });

    it("should return 400 when baselineValue < projectValue", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 2024, baselineValue: 5000, projectValue: 8000 },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("NEGATIVE_REDUCTION_VALUE");
    });

    it("should return 422 when project is not in DRAFT status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 2024, baselineValue: 10000, projectValue: 7000 },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/99999999/reports",
        payload: { reductionYear: 2024, baselineValue: 10000, projectValue: 7000 },
      });

      expect(response.statusCode).toBe(404);
    });

    it("should return 400 when reductionYear is out of range", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reports`,
        payload: { reductionYear: 1990, baselineValue: 10000, projectValue: 7000 },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
