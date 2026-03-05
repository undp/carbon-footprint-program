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
import {
  createInventoryFromPattern,
  carbonInventoryPatterns,
  cleanupCarbonInventoryTestData,
} from "@test/factories/carbonInventorySeeder.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  createTestOrganizationDataSubmission,
  cleanupTestSubmissions,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  SubmissionStatus,
  OrganizationDataStatus,
  SubmissionType,
} from "@repo/database";
import { ApiErrorResponse } from "../../../src/commonSchemas/errors.js";

describe("POST /api/carbon-inventories/:id/request-calculation - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await prisma.organizationData.deleteMany();
    await prisma.userOrganizationMembership.deleteMany();
    await prisma.organization.deleteMany();
  });

  describe("Successful request", () => {
    it("should return 201 and create submission records for an accredited organization", async () => {
      const user = await getTestLoggedUser(prisma);

      // Create accredited organization
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        user.id
      );

      // Create carbon inventory linked to accredited organization
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: org.id }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-calculation`,
      });

      expect(response.statusCode).toBe(200);

      // Verify submission records were created
      const submissionSubjectCI =
        await prisma.submissionSubjectCarbonInventory.findUnique({
          where: { carbonInventoryId: inventory.id },
          include: {
            subject: {
              include: {
                submissions: true,
              },
            },
          },
        });

      expect(submissionSubjectCI).not.toBeNull();
      expect(submissionSubjectCI!.subject.submissions).toHaveLength(1);
      expect(submissionSubjectCI!.subject.submissions[0].type).toBe(
        SubmissionType.CARBON_INVENTORY_CALCULATION
      );
      expect(submissionSubjectCI!.subject.submissions[0].status).toBe(
        "PENDING"
      );
    });
  });

  describe("Validation errors", () => {
    it("should return 404 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/999999/request-calculation",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_FOUND");
    });

    it("should return 422 when carbon inventory has no associated organization", async () => {
      // Create carbon inventory without organization
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-calculation`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_NOT_ASSOCIATED");
    });

    it("should return 422 when associated organization is not accredited", async () => {
      const user = await getTestLoggedUser(prisma);

      // Create non-accredited organization (submission is PENDING, not APPROVED)
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        user.id
      );

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: org.id }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-calculation`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_NOT_ACCREDITED");
    });
  });
});
