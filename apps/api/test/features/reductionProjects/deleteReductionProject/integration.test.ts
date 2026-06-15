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
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  setupReductionProjectPrerequisites,
  createTestReductionProject,
  createReductionProjectInDisplayStatus,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { OrganizationRole } from "@repo/database/enums";
import { ReductionProjectStatus } from "@repo/types";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("DELETE /api/reduction-projects/:id - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupReductionProjectTestData(prisma);
  });

  describe("Successful deletion", () => {
    it("should soft-delete a DRAFT reduction project", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);

      const dbProject = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(dbProject?.status).toBe(ReductionProjectStatus.DELETED);
      expect(dbProject?.updatedById).toBe(testUserId);
    });
  });

  describe("Not deletable errors", () => {
    const NON_DELETABLE = [
      "SUBMITTED",
      "REVIEWED",
      "APPROVED",
      "REJECTED",
    ] as const;

    it.each(NON_DELETABLE)(
      "should return 422 when displayStatus is %s",
      async (displayStatus) => {
        const { organization, carbonInventory, subcategory } =
          await setupReductionProjectPrerequisites(prisma, testUserId);

        const project = await createReductionProjectInDisplayStatus(
          prisma,
          {
            organizationId: organization.id,
            carbonInventoryId: carbonInventory.id,
            subcategoryId: subcategory.id,
            createdById: testUserId,
          },
          displayStatus
        );

        const response = await app.inject({
          method: "DELETE",
          url: `/api/reduction-projects/${project.id}`,
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("REDUCTION_PROJECT_NOT_DELETABLE");

        const dbProject = await prisma.reductionProject.findUnique({
          where: { id: project.id },
        });
        expect(dbProject?.status).toBe(ReductionProjectStatus.ACTIVE);
      }
    );
  });

  describe("Authorization errors", () => {
    // Returns 403 (not 404) for non-existent resources to prevent ID enumeration.
    it("should return 403 when the reduction project does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/reduction-projects/999999999",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when user has VIEWER role", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(
          prisma,
          testUserId,
          OrganizationRole.VIEWER
        );

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(403);
    });

    it("should return 403 when user is not member of organization", async () => {
      const { organization, carbonInventory, subcategory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const response = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for an invalid id format", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/reduction-projects/not-a-number",
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
