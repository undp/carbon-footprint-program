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
import type { RejectReductionProjectResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createSubmittableReductionProject,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import { type ApiErrorResponse, VALIDATION_ERROR_CODE } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/reject - Integration Tests", () => {
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

  async function submitProject(projectId: bigint): Promise<void> {
    await app.inject({
      method: "POST",
      url: `/api/reduction-projects/${projectId}/submit`,
    });
  }

  describe("Happy path", () => {
    it("should reject a project in IN_REVIEW status", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );
      await submitProject(project.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reject`,
        payload: { reviewComments: "Insufficient documentation" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as RejectReductionProjectResponse;
      expect(body.status).toBe("REJECTED");
    });

    it("should store reviewComments on the submission", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );
      await submitProject(project.id);

      await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reject`,
        payload: { reviewComments: "Needs more detail" },
      });

      const submission = await prisma.submission.findFirst({
        where: { type: "REDUCTION_PLAN_VERIFICATION" },
      });
      expect(submission?.reviewComments).toBe("Needs more detail");
      expect(submission?.status).toBe("REJECTED");
    });
  });

  describe("Error cases", () => {
    it("should return 400 when reviewComments is missing", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reject`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 422 when project is not in IN_REVIEW status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "DRAFT",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reject`,
        payload: { reviewComments: "Not ready" },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/99999999/reject",
        payload: { reviewComments: "Not found test" },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
