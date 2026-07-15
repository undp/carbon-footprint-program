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
import { createTestCarbonInventorySubmission } from "@test/factories/submissionFactory.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createCarbonInventory } from "@test/factories/carbonInventorySeeder.js";
import { getTestMethodologyVersionId } from "@test/factories/methodologyFactory.js";
import {
  GetOrganizationRecognitionsResponse,
  SubmissionType,
} from "@repo/types";
import {
  SubmissionStatus,
  OrganizationStatus,
  InventoryStatus,
} from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("GET /api/app/organizations/:id/recognitions - Integration Tests", () => {
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

  const seedApprovedReductionProject = async (year: number) => {
    const { organization, carbonInventory, subcategory } =
      await setupReductionProjectPrerequisites(prisma, testUserId);

    // Promote the inventory verification submission to APPROVED so the
    // baseline inventory recognition also appears (setup creates it APPROVED).
    const project = await createTestReductionProject(
      prisma,
      {
        organizationId: organization.id,
        carbonInventoryId: carbonInventory.id,
        subcategoryId: subcategory.id,
        createdById: testUserId,
      },
      { year }
    );

    await createTestReductionProjectSubmission(
      prisma,
      project.id,
      SubmissionStatus.APPROVED,
      testUserId
    );

    return { organization, carbonInventory, project };
  };

  it("includes approved reduction project recognitions with totalEmissions=null", async () => {
    const { organization, project } = await seedApprovedReductionProject(2024);

    const response = await app.inject({
      method: "GET",
      url: `/api/app/organizations/${organization.id.toString()}/recognitions`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetOrganizationRecognitionsResponse;

    const reductionRows = body.filter(
      (r) => r.submissionType === SubmissionType.REDUCTION_PROJECT_VERIFICATION
    );
    expect(reductionRows).toHaveLength(1);
    expect(reductionRows[0].totalEmissions).toBeNull();
    expect(reductionRows[0].measurementYear).toBe(project.year);
  });

  it("filters reduction project rows by project.year", async () => {
    const { organization } = await seedApprovedReductionProject(2023);

    const matching = await app.inject({
      method: "GET",
      url: `/api/app/organizations/${organization.id.toString()}/recognitions?year=2023`,
    });
    const nonMatching = await app.inject({
      method: "GET",
      url: `/api/app/organizations/${organization.id.toString()}/recognitions?year=2022`,
    });

    const matchingBody = JSON.parse(
      matching.body
    ) as GetOrganizationRecognitionsResponse;
    const nonMatchingBody = JSON.parse(
      nonMatching.body
    ) as GetOrganizationRecognitionsResponse;

    expect(
      matchingBody.some(
        (r) =>
          r.submissionType === SubmissionType.REDUCTION_PROJECT_VERIFICATION
      )
    ).toBe(true);
    expect(
      nonMatchingBody.some(
        (r) =>
          r.submissionType === SubmissionType.REDUCTION_PROJECT_VERIFICATION
      )
    ).toBe(false);
  });

  it("excludes reduction rows when submissionTypes filter omits REDUCTION_PROJECT_VERIFICATION", async () => {
    const { organization, carbonInventory } =
      await seedApprovedReductionProject(2024);

    // Add an approved CALCULATION submission so the inventory-only filter has data.
    await createTestCarbonInventorySubmission(
      prisma,
      carbonInventory.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      SubmissionStatus.APPROVED,
      testUserId
    );

    const response = await app.inject({
      method: "GET",
      url: `/api/app/organizations/${organization.id.toString()}/recognitions?submissionTypes=CARBON_INVENTORY_CALCULATION`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetOrganizationRecognitionsResponse;
    expect(
      body.some(
        (r) =>
          r.submissionType === SubmissionType.REDUCTION_PROJECT_VERIFICATION
      )
    ).toBe(false);
  });

  it("returns only reduction rows when submissionTypes filter is REDUCTION_PROJECT_VERIFICATION", async () => {
    const { organization } = await seedApprovedReductionProject(2024);

    const response = await app.inject({
      method: "GET",
      url: `/api/app/organizations/${organization.id.toString()}/recognitions?submissionTypes=REDUCTION_PROJECT_VERIFICATION`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(
      response.body
    ) as GetOrganizationRecognitionsResponse;
    expect(body.length).toBeGreaterThan(0);
    expect(
      body.every(
        (r) =>
          r.submissionType === SubmissionType.REDUCTION_PROJECT_VERIFICATION
      )
    ).toBe(true);
  });

  describe("Organization not found", () => {
    it("returns 404 when the organization id does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/app/organizations/9999999999/recognitions",
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 404 when the organization is BLOCKED (not ACTIVE)", async () => {
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.BLOCKED,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id.toString()}/recognitions`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBeTruthy();
    });
  });

  describe("Data integrity guard", () => {
    it("surfaces a 500 data-integrity error when an ACTIVE inventory with approved submissions has no year", async () => {
      // `year` is only filtered by the query when a `year` param is supplied, so
      // an inventory whose `year` is null still matches the (unfiltered) query
      // as long as it carries an approved submission — a state that should
      // never occur in practice but the service defends against it explicitly.
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const methodologyVersionId = await getTestMethodologyVersionId(prisma);
      const inventory = await createCarbonInventory(prisma, {
        organizationId: organization.id,
        usageMode: "SIMPLIFIED",
        status: InventoryStatus.ACTIVE,
        methodologyVersionId,
        year: null,
      });
      await createTestCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        SubmissionStatus.APPROVED,
        testUserId
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/app/organizations/${organization.id.toString()}/recognitions`,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("DATA_INTEGRITY_ERROR");
    });
  });
});
