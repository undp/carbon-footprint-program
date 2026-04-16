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
import type { GetReductionProjectByIdResponse } from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("GET /api/reduction-projects/:id - Integration Tests", () => {
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

  describe("Successful retrieval", () => {
    it("should return 200 with full reduction project details", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionProjectByIdResponse;
      expect(body.id).toBe(project.id.toString());
      expect(body.name).toBe(project.name);
      expect(body.organizationId).toBe(organization.id.toString());
      expect(body.carbonInventoryId).toBe(carbonInventory.id.toString());
      expect(body.subcategory).toEqual({
        id: subcategory.id.toString(),
        name: subcategory.name,
      });
      expect(body.createdById).toBe(testUserId.toString());
    });

    it("should include displayStatus derived from submissions", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Initially should be DRAFT
      const response1 = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response1.statusCode).toBe(200);
      const body1 = JSON.parse(
        response1.body
      ) as GetReductionProjectByIdResponse;
      expect(body1.status).toBe("DRAFT");

      // Add PENDING submission -> SUBMITTED
      await createTestReductionProjectSubmission(
        prisma,
        project.id,
        SubmissionStatus.PENDING,
        testUserId
      );

      const response2 = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response2.statusCode).toBe(200);
      const body2 = JSON.parse(
        response2.body
      ) as GetReductionProjectByIdResponse;
      expect(body2.status).toBe("SUBMITTED");
    });

    it("should work for user with VIEWER role", async () => {
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
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetReductionProjectByIdResponse;
      expect(body.id).toBe(project.id.toString());
    });

    it("should work for user with CONTRIBUTOR role", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(
          prisma,
          testUserId,
          OrganizationRole.CONTRIBUTOR
        );

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
    });

    it("should work for user with ADMIN role", async () => {
      const { organization, carbonInventory, subcategory } =
        await setupReductionProjectPrerequisites(
          prisma,
          testUserId,
          OrganizationRole.ADMIN
        );

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("Authorization errors", () => {
    it("should return 403 when user is not member of organization", async () => {
      const { organization, carbonInventory, subcategory, membership } =
        await setupReductionProjectPrerequisites(prisma, testUserId);

      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });

      // Remove membership
      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for non-existent project ID (prevent enumeration)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/999999999",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for DELETED project", async () => {
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
        { status: "DELETED" }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}`,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe("Validation errors", () => {
    it("should return 400 for invalid ID format (non-numeric)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/invalid-id",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (decimal)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/123.45",
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 for invalid ID format (negative)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/reduction-projects/-123",
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
