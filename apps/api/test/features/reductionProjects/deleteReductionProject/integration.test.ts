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
  createTestReductionProjectSubmission,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { SubmissionStatus, ReductionProjectStatus } from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import type { GetReductionProjectByIdResponse } from "@repo/types";

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
    it("should soft-delete a DRAFT project (no submission) and return 200", async () => {
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

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.status).toBe(ReductionProjectStatus.DELETED);
    });
  });

  describe("Invalid state transitions", () => {
    it.each([
      ["SUBMITTED", SubmissionStatus.PENDING],
      ["REVIEWED", SubmissionStatus.REVIEWED],
      ["APPROVED", SubmissionStatus.APPROVED],
      ["REJECTED", SubmissionStatus.REJECTED],
    ] as const)(
      "should return 422 REDUCTION_PROJECT_NOT_DELETABLE when displayStatus is %s",
      async (_label, submissionStatus) => {
        const { organization, carbonInventory, subcategory } =
          await setupReductionProjectPrerequisites(prisma, testUserId);

        const project = await createTestReductionProject(prisma, {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        });

        await createTestReductionProjectSubmission(
          prisma,
          project.id,
          submissionStatus,
          testUserId
        );

        const response = await app.inject({
          method: "DELETE",
          url: `/api/reduction-projects/${project.id}`,
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("REDUCTION_PROJECT_NOT_DELETABLE");

        const unchanged = await prisma.reductionProject.findUnique({
          where: { id: project.id },
        });
        expect(unchanged?.status).toBe(ReductionProjectStatus.ACTIVE);
      }
    );
  });

  describe("Authorization errors", () => {
    it("should return 403 when the project does not exist", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/reduction-projects/999999999",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when the project is already deleted", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(
        prisma,
        {
          organizationId: organization.id,
          carbonInventoryId: carbonInventory.id,
          subcategoryId: subcategory.id,
          createdById: testUserId,
        },
        { status: ReductionProjectStatus.DELETED }
      );

      const response = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when the caller is not a member of the project's organization", async () => {
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
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 when the caller has only VIEWER role", async () => {
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
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });
  });

  // Regression net for a latent-divergence risk flagged in review (PR #414,
  // comment C1): `deleteReductionProjectService` guards deletability with an
  // atomic `updateMany({ where: { status: ACTIVE, submission: { is: null } } })`
  // — i.e. "a DRAFT = an ACTIVE project with NO submission subject at all".
  // The canonical DRAFT definition lives in
  // `calculateReductionProjectDisplayStatus` (helpers.ts): "no
  // REDUCTION_PROJECT_VERIFICATION submission". The two definitions coincide
  // today only because REDUCTION_PROJECT_VERIFICATION is the sole submission
  // type for reduction projects and its submission subject is always created
  // together with it (see `createTestReductionProjectSubmission` /
  // `createReductionProjectSubmission` in helpers.ts). The team decided to
  // KEEP the `updateMany` shortcut rather than align it with
  // `calculateReductionProjectDisplayStatus` explicitly. If a future change
  // ever creates a submission subject without a verification submission (e.g.
  // a second submission type is introduced), the two definitions will
  // diverge silently: `calculateReductionProjectDisplayStatus` may still
  // report DRAFT while the delete guard would refuse to delete (or
  // vice-versa). This test pins today's agreement between both definitions
  // on the same fixtures, so it fails loudly the day that equivalence breaks.
  describe("Regression: submission-subject vs verification-submission DRAFT parity", () => {
    it("agrees that a fresh project with no submission subject is DRAFT and deletable", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // (a) calculateReductionProjectDisplayStatus, via the real endpoint
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });
      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(
        getResponse.body
      ) as GetReductionProjectByIdResponse;
      expect(getBody.status).toBe("DRAFT");

      // (b) the atomic updateMany guard in deleteReductionProjectService
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });
      expect(deleteResponse.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.status).toBe(ReductionProjectStatus.DELETED);
    });

    it("agrees that a project with a submission subject + PENDING verification submission is NOT a DRAFT and is not deletable", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Submitting for verification creates BOTH the submission subject and
      // the REDUCTION_PROJECT_VERIFICATION submission in one go — exactly
      // the coupling the delete guard relies on.
      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.PENDING,
        testUserId
      );

      // (a) calculateReductionProjectDisplayStatus, via the real endpoint
      const getResponse = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });
      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(
        getResponse.body
      ) as GetReductionProjectByIdResponse;
      expect(getBody.status).not.toBe("DRAFT");
      expect(getBody.status).toBe("SUBMITTED");

      // (b) the atomic updateMany guard in deleteReductionProjectService
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: `/api/reduction-projects/${project.id}`,
      });
      expect(deleteResponse.statusCode).toBe(422);
      const deleteBody = JSON.parse(deleteResponse.body) as ApiErrorResponse;
      expect(deleteBody.code).toBe("REDUCTION_PROJECT_NOT_DELETABLE");

      const unchanged = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(unchanged?.status).toBe(ReductionProjectStatus.ACTIVE);
    });
  });
});
