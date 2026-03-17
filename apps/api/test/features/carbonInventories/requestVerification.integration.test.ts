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
import { createCarbonInventorySubmission } from "../../../src/features/carbonInventories/helpers.js";

describe("POST /api/carbon-inventories/:id/request-verification - Integration Tests", () => {
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
   * Helper: creates an accredited organization and a carbon inventory
   * with an APPROVED calculation submission (CALCULATION_APPROVED state).
   */
  async function createInventoryWithApprovedCalculation() {
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

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { organizationId: org.id }
    );

    // Create an APPROVED calculation submission
    await createCarbonInventorySubmission(
      prisma,
      inventory.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      user.id
    );
    const subjectCI = await prisma.submissionSubjectCarbonInventory.findUnique({
      where: { carbonInventoryId: inventory.id },
      include: { subject: { include: { submissions: true } } },
    });
    await prisma.submission.update({
      where: { id: subjectCI!.subject.submissions[0].id },
      data: { status: SubmissionStatus.APPROVED },
    });

    return { inventory, org, user };
  }

  describe("Successful request", () => {
    it("should return 200 and create a verification submission for an inventory with approved calculation", async () => {
      const { inventory } = await createInventoryWithApprovedCalculation();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-verification`,
      });

      expect(response.statusCode).toBe(200);

      const submissionSubjectCI =
        await prisma.submissionSubjectCarbonInventory.findUnique({
          where: { carbonInventoryId: inventory.id },
          include: {
            subject: {
              include: {
                submissions: {
                  orderBy: { id: "desc" },
                },
              },
            },
          },
        });

      expect(submissionSubjectCI).not.toBeNull();
      // Should have 2 submissions: the original APPROVED calculation + new PENDING verification
      expect(submissionSubjectCI!.subject.submissions).toHaveLength(2);

      const verificationSubmission =
        submissionSubjectCI!.subject.submissions.find(
          (s) => s.type === SubmissionType.CARBON_INVENTORY_VERIFICATION
        );
      expect(verificationSubmission).toBeDefined();
      expect(verificationSubmission!.status).toBe("PENDING");
    });
  });

  describe("Validation errors", () => {
    it("should return 403 when carbon inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/999999/request-verification",
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
        url: `/api/carbon-inventories/${inventory.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_NOT_ASSOCIATED");
    });

    it("should return 422 when associated organization is not accredited", async () => {
      const user = await getTestLoggedUser(prisma);

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
        url: `/api/carbon-inventories/${inventory.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_NOT_ACCREDITED");
    });

    it("should return 422 when inventory is in DRAFT state (no approved calculation)", async () => {
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

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: org.id }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/request-verification`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_CANNOT_REQUEST_VERIFICATION");
    });
  });
});
