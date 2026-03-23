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
import type { ReopenReductionProjectResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  createSubmittableReductionProject,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/reduction-projects/:id/reopen - Integration Tests", () => {
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

  async function rejectProject(projectId: bigint): Promise<void> {
    await app.inject({
      method: "POST",
      url: `/api/reduction-projects/${projectId}/submit`,
    });
    await app.inject({
      method: "POST",
      url: `/api/reduction-projects/${projectId}/reject`,
      payload: { reviewComments: "Needs revision" },
    });
  }

  describe("Happy path", () => {
    it("should reopen a REJECTED project back to DRAFT", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );
      await rejectProject(project.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reopen`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ReopenReductionProjectResponse;
      expect(body.status).toBe("DRAFT");
    });
  });

  describe("Error cases", () => {
    it("should return 422 when project is not in REJECTED status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "DRAFT",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reopen`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should return 422 when project is in APPROVED status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "APPROVED",
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/reopen`,
      });

      expect(response.statusCode).toBe(422);
    });

    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/reduction-projects/99999999/reopen",
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
