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
import type { GetReductionProjectAccessResponse } from "@repo/types";
import { SubmissionStatus } from "@repo/database";
import { OrganizationRole, SystemRole } from "@repo/database/enums";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/reduction-projects/:id/access - Integration Tests", () => {
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

  it("returns canEdit=true for a CONTRIBUTOR member on a draft project", async () => {
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
      url: `/api/reduction-projects/${project.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetReductionProjectAccessResponse;
    expect(body.canEdit).toBe(true);
    expect(body.membership).toEqual({ role: OrganizationRole.CONTRIBUTOR });
  });

  it("returns canEdit=false for a VIEWER member", async () => {
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
      url: `/api/reduction-projects/${project.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetReductionProjectAccessResponse;
    expect(body.canEdit).toBe(false);
    expect(body.membership).toEqual({ role: OrganizationRole.VIEWER });
  });

  it("returns canEdit=false for an ADMIN system role with no membership", async () => {
    const testUser = await getTestLoggedUser(prisma);
    const originalRole = testUser.role;
    const { organization, carbonInventory, subcategory, membership } =
      await setupReductionProjectPrerequisites(prisma, testUserId);

    try {
      const project = await createTestReductionProject(prisma, {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      });
      await prisma.userOrganizationMembership.delete({
        where: { id: membership.id },
      });
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: SystemRole.ADMIN },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/reduction-projects/${project.id}/access`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as GetReductionProjectAccessResponse;
      expect(body.canEdit).toBe(false);
      expect(body.membership).toBeNull();
    } finally {
      await prisma.user.update({
        where: { id: testUser.id },
        data: { role: originalRole },
      });
    }
  });

  it("returns canEdit=false when status is non-editable even with edit role", async () => {
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
    // APPROVED verification submission → APPROVED status (not editable).
    await createTestReductionProjectSubmission(
      prisma,
      project.id,
      SubmissionStatus.APPROVED,
      testUserId
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/reduction-projects/${project.id}/access`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as GetReductionProjectAccessResponse;
    expect(body.canEdit).toBe(false);
    expect(body.membership).toEqual({ role: OrganizationRole.CONTRIBUTOR });
  });
});
