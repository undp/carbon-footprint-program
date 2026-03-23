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
import type { SubmitReductionProjectResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createSubmittableReductionProject,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/submit - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let organizationId: bigint;
  let subcategoryId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    organizationId = org.id;

    // Get a real subcategory ID from the DB (seeded data)
    const subcategory = await prisma.subcategory.findFirst();
    if (!subcategory) throw new Error("No subcategory found in DB");
    subcategoryId = subcategory.id;
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
    it("should submit a complete project and change status to IN_REVIEW", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as SubmitReductionProjectResponse;
      expect(body.status).toBe("IN_REVIEW");
      expect(body.reports).toHaveLength(1);
      expect(body.files).toHaveLength(3);
    });

    it("should create a submission record in the database", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );

      await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      const submission = await prisma.submission.findFirst({
        where: { type: "REDUCTION_PLAN_VERIFICATION", status: "PENDING" },
      });
      expect(submission).toBeDefined();
    });
  });

  describe("Error cases", () => {
    it("should return 422 when project is not in DRAFT status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should return 422 when required fields are missing", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        // Missing implementationDate, subcategoryId, selectedGases
        name: "Incomplete Project",
        selectedGases: [],
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INCOMPLETE_PROJECT");
    });

    it("should return 422 when project has no reports", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        name: "No Reports Project",
        implementationDate: new Date("2024-01-01"),
        subcategoryId,
        selectedGases: ["CO2"],
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INCOMPLETE_PROJECT");
    });

    it("should return 422 when project is missing required documents", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        name: "Missing Docs Project",
        implementationDate: new Date("2024-01-01"),
        subcategoryId,
        selectedGases: ["CO2"],
      });
      await prisma.reductionProjectReport.create({
        data: {
          reductionProjectId: project.id,
          reductionYear: 2024,
          baselineValue: 10000,
          projectValue: 7000,
          reductionValue: 3000,
        },
      });
      // Only add 1 of the 3 required file types

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MISSING_REQUIRED_DOCUMENTS");
    });

    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/99999999/submit",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
