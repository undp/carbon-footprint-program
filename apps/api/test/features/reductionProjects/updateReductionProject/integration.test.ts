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
import type { UpdateReductionProjectResponse } from "@repo/types";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization, cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestReductionProject,
  cleanupTestReductionProjects,
} from "@test/factories/reductionProjectFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("PATCH /api/reduction-projects/:id - Integration Tests", () => {
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
    it("should update project name", async () => {
      const project = await createTestReductionProject(prisma, organizationId);

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "Updated Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateReductionProjectResponse;
      expect(body.name).toBe("Updated Name");
    });

    it("should do a partial update (only provided fields change)", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        name: "Original Name",
        description: "Original Description",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "New Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateReductionProjectResponse;
      expect(body.name).toBe("New Name");
      expect(body.description).toBe("Original Description");
    });

    it("should clear otherInitiativeDescription when reportedInOtherInitiative is set to false", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        reportedInOtherInitiative: true,
        otherInitiativeDescription: "CDP",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { reportedInOtherInitiative: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as UpdateReductionProjectResponse;
      expect(body.reportedInOtherInitiative).toBe(false);
      expect(body.otherInitiativeDescription).toBeNull();
    });
  });

  describe("Error cases", () => {
    it("should return 404 when project does not exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/api/reduction-projects/99999999",
        payload: { name: "Test" },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_FOUND");
    });

    it("should return 422 when project is not in DRAFT status", async () => {
      const project = await createTestReductionProject(prisma, organizationId, {
        status: "IN_REVIEW",
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "Updated" },
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("INVALID_STATUS_TRANSITION");
    });
  });
});
