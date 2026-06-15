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
  buildReductionProjectPayload,
  createTestReductionProject,
  createReductionProjectInDisplayStatus,
  cleanupReductionProjectTestData,
} from "@test/factories/reductionProjectSeeder.js";
import { SubmissionType } from "@repo/database";
import { GwpSourceEnum } from "@repo/types";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("PATCH /api/reduction-projects/:id - Integration Tests", () => {
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

  describe("Successful update", () => {
    it("should update a DRAFT reduction project", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        { name: "Updated Draft Name" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.name).toBe("Updated Draft Name");
    });

    it("should update a REVIEWED reduction project", async () => {
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
        "REVIEWED"
      );

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        { name: "Updated Reviewed Name" }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.name).toBe("Updated Reviewed Name");
    });

    it("should NOT create a new submission on update (REVIEWED stays REVIEWED)", async () => {
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
        "REVIEWED"
      );

      const submissionsBefore = await prisma.submission.count({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: buildReductionProjectPayload(
          organization.id.toString(),
          carbonInventory.id.toString(),
          subcategory.id.toString(),
          { name: "Edited" }
        ),
      });

      expect(response.statusCode).toBe(200);

      const submissionsAfter = await prisma.submission.count({
        where: {
          type: SubmissionType.REDUCTION_PROJECT_VERIFICATION,
          subject: { reductionProject: { reductionProjectId: project.id } },
        },
      });

      // Update writes fields only — it never (re)creates a submission.
      expect(submissionsAfter).toBe(submissionsBefore);
    });

    it("should update all mutable fields", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const payload = buildReductionProjectPayload(
        organization.id.toString(),
        carbonInventory.id.toString(),
        subcategory.id.toString(),
        {
          name: "New Name",
          description: "New description",
          implementationDate: "2025-06-15",
          gwpUsed: GwpSourceEnum.IPCC_AR6,
          consideredGei: ["CO2", "CH4"],
          reportedElsewhere: true,
          reportedElsewhereDescription: "External registry",
          year: 2025,
          baselineScenario: 2000,
          projectScenario: 1500,
        }
      );

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload,
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.reductionProject.findUnique({
        where: { id: project.id },
      });
      expect(updated?.name).toBe("New Name");
      expect(updated?.description).toBe("New description");
      expect(updated?.gwpUsed).toBe(GwpSourceEnum.IPCC_AR6);
      expect(updated?.reportedElsewhere).toBe(true);
      expect(updated?.year).toBe(2025);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 when required fields are missing", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: { name: "Just name" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Authorization errors", () => {
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
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: buildReductionProjectPayload(
          organization.id.toString(),
          carbonInventory.id.toString(),
          subcategory.id.toString()
        ),
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
        method: "PATCH",
        url: `/api/reduction-projects/${project.id}`,
        payload: buildReductionProjectPayload(
          organization.id.toString(),
          carbonInventory.id.toString(),
          subcategory.id.toString()
        ),
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Not found errors", () => {
    it("should return 404 when reduction project does not exist", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const response = await app.inject({
        method: "PATCH",
        url: "/api/reduction-projects/999999999",
        payload: buildReductionProjectPayload(
          organization.id.toString(),
          carbonInventory.id.toString(),
          subcategory.id.toString()
        ),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("REDUCTION_PROJECT_NOT_FOUND");
    });
  });

  describe("Not updatable errors", () => {
    const NON_EDITABLE = ["SUBMITTED", "APPROVED", "REJECTED"] as const;

    it.each(NON_EDITABLE)(
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
          method: "PATCH",
          url: `/api/reduction-projects/${project.id}`,
          payload: buildReductionProjectPayload(
            organization.id.toString(),
            carbonInventory.id.toString(),
            subcategory.id.toString()
          ),
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("REDUCTION_PROJECT_NOT_UPDATABLE");
      }
    );
  });
});
