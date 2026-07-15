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
import { createTestMembership } from "@test/factories/membershipFactory.js";
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
import { createCarbonInventorySubmission } from "../../../src/features/carbonInventories/helpers.js";
import { requestCalculationService } from "../../../src/features/carbonInventories/requestCalculation/service.js";
import { CarbonInventoryNotFoundError } from "../../../src/features/carbonInventories/errors.js";

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

  /**
   * Helper: creates an accredited organization and a carbon inventory in DRAFT state.
   */
  async function createAccreditedInventory() {
    const user = await getTestLoggedUser(prisma);

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

    await createTestMembership(prisma, user.id, org.id);

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { organizationId: org.id }
    );

    return { inventory, org, user };
  }

  describe("Successful request", () => {
    it("should return 200 and create a calculation submission for an accredited organization", async () => {
      const { inventory } = await createAccreditedInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-calculation`,
      });

      expect(response.statusCode).toBe(200);

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

      const calculationSubmission =
        submissionSubjectCI!.subject.submissions.find(
          (s) => s.type === SubmissionType.CARBON_INVENTORY_CALCULATION
        );
      expect(calculationSubmission).toBeDefined();
      expect(calculationSubmission!.status).toBe("PENDING");
    });
  });

  describe("Validation errors", () => {
    // Returns 403 FORBIDDEN (not 404) for non-existent resources to prevent
    // resource ID enumeration (security-by-obscurity).
    it("should return 403 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/999999/request-calculation",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 422 when carbon inventory has no associated organization", async () => {
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

      const org = await createTestOrganization(prisma);
      await createTestMembership(prisma, user.id, org.id);
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

    it("should return 422 when inventory already has an approved calculation", async () => {
      const { inventory, user } = await createAccreditedInventory();

      // Create an APPROVED calculation submission
      await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );
      const subjectCI =
        await prisma.submissionSubjectCarbonInventory.findUnique({
          where: { carbonInventoryId: inventory.id },
          include: { subject: { include: { submissions: true } } },
        });
      await prisma.submission.update({
        where: { id: subjectCI!.subject.submissions[0].id },
        data: { status: SubmissionStatus.APPROVED },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-calculation`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_CANNOT_REQUEST_CALCULATION");
    });
  });

  describe("Service-level unit checks", () => {
    // The HTTP layer's requireCarbonInventoryAccess preHandler already returns
    // 403 for a non-existent inventory before the service is ever reached, so
    // exercise the service's own not-found guard directly against the real
    // database instead.
    it("throws CarbonInventoryNotFoundError when the inventory does not exist", async () => {
      await expect(
        requestCalculationService(prisma, "999999999", null)
      ).rejects.toThrow(CarbonInventoryNotFoundError);
    });

    it("treats a null user as an anonymous actor (createdById = null) when submitting", async () => {
      const { inventory } = await createAccreditedInventory();

      await requestCalculationService(prisma, inventory.id.toString(), null);

      const submissionSubjectCI =
        await prisma.submissionSubjectCarbonInventory.findUnique({
          where: { carbonInventoryId: inventory.id },
          include: { subject: { include: { submissions: true } } },
        });

      expect(submissionSubjectCI).not.toBeNull();
      expect(
        submissionSubjectCI!.subject.submissions[0].createdById
      ).toBeNull();
    });
  });
});
