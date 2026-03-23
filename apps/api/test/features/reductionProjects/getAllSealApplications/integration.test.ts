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
import type { GetAllSealApplicationsResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createSubmittableReductionProject,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import { VALIDATION_ERROR_CODE, type ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/reduction-projects/seal-applications - Integration Tests", () => {
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

  describe("Happy path", () => {
    it("should return empty array when no submissions exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/seal-applications?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSealApplicationsResponse;
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });

    it("should return seal applications after a project is submitted", async () => {
      const project = await createSubmittableReductionProject(
        prisma,
        organizationId,
        subcategoryId
      );

      await app.inject({
        method: "POST",
        url: `/api/reduction-projects/${project.id}/submit`,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/seal-applications?organizationId=${organizationId}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetAllSealApplicationsResponse;
      expect(body).toHaveLength(1);
      expect(body[0].reductionProjectId).toBe(project.id.toString());
      expect(body[0].projectName).toBe(project.name);
      expect(body[0].status).toBe("IN_REVIEW");
      expect(body[0].reductionYear).toBe(2024);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when organizationId is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/seal-applications",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
