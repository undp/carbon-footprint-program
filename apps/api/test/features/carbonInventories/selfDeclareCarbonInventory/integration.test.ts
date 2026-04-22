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
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { cleanupTestSubmissions } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import {
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
  MeasurementRecognitionBehavior,
} from "@repo/types";
import { ApiErrorResponse } from "../../../../src/commonSchemas/errors.js";
import { createCarbonInventorySubmission } from "../../../../src/features/carbonInventories/helpers.js";
import { createTestMembership } from "../../../factories/membershipFactory.js";

describe("POST /api/carbon-inventories/:id/self-declare - Integration Tests", () => {
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
    await cleanupTestOrganization(prisma);
    await prisma.badge.deleteMany();
    await prisma.file.deleteMany();
    await setRecognitionBehavior(MeasurementRecognitionBehaviorEnum.AUTOMATIC);
  });

  /**
   * Helper: creates a carbon inventory that meets all self-declaration
   * prerequisites (ACTIVE status, organizationId set, year set, not yet
   * self-declared, DRAFT display status).
   */
  async function createSelfDeclarableInventory() {
    const user = await getTestLoggedUser(prisma);
    const org = await createTestOrganization(prisma);
    await createTestMembership(prisma, user.id, org.id);

    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      { organizationId: org.id, year: 2024 }
    );

    return { inventory, org, user };
  }

  async function setRecognitionBehavior(value: MeasurementRecognitionBehavior) {
    await prisma.systemParameter.update({
      where: {
        key: SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR,
      },
      data: { value },
    });
  }

  describe("Successful self-declaration", () => {
    it("should return 200 and set isSelfDeclared to true", async () => {
      const { inventory } = await createSelfDeclarableInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(200);

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.isSelfDeclared).toBe(true);
    });

    it("should assign active badge to the auto-approved submission when badge exists", async () => {
      await setRecognitionBehavior(
        MeasurementRecognitionBehaviorEnum.AUTOMATIC
      );

      // Seed a file and an active badge for CARBON_INVENTORY_CALCULATION
      const file = await prisma.file.create({
        data: {
          uuid: crypto.randomUUID(),
          originalName: "badge.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          blobPath: "test/badge.png",
        },
      });
      const badge = await prisma.badge.create({
        data: {
          type: SubmissionType.CARBON_INVENTORY_CALCULATION,
          status: "ACTIVE",
          fileId: file.id,
        },
      });

      const { inventory } = await createSelfDeclarableInventory();

      await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

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

      const submission = submissionSubjectCI!.subject.submissions[0];
      expect(submission.badgeId).toBe(badge.id);
    });
  });

  describe("Badge behaviour when no ACTIVE badge exists (regression)", () => {
    it("should auto-approve with badgeId=null when no ACTIVE CARBON_INVENTORY_CALCULATION badge exists", async () => {
      await setRecognitionBehavior(MeasurementRecognitionBehaviorEnum.AUTOMATIC);

      // Ensure no active badge for CALCULATION type
      await prisma.badge.deleteMany({
        where: { type: SubmissionType.CARBON_INVENTORY_CALCULATION, status: "ACTIVE" },
      });

      const { inventory } = await createSelfDeclarableInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(200);

      const submissionSubjectCI =
        await prisma.submissionSubjectCarbonInventory.findUnique({
          where: { carbonInventoryId: inventory.id },
          include: { subject: { include: { submissions: true } } },
        });

      const submission = submissionSubjectCI!.subject.submissions[0];
      expect(submission.status).toBe(SubmissionStatus.APPROVED_AUTOMATICALLY);
      expect(submission.badgeId).toBeNull();
    });
  });

  describe("System parameter behavior", () => {
    it("should auto-create and approve a CALCULATION submission when recognition behavior is AUTOMATIC", async () => {
      await setRecognitionBehavior(
        MeasurementRecognitionBehaviorEnum.AUTOMATIC
      );

      const { inventory } = await createSelfDeclarableInventory();

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(200);

      const dbInventory = await prisma.carbonInventory.findUnique({
        where: { id: inventory.id },
      });
      expect(dbInventory?.isSelfDeclared).toBe(true);

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

      const submission = submissionSubjectCI!.subject.submissions[0];
      expect(submission.type).toBe(SubmissionType.CARBON_INVENTORY_CALCULATION);
      expect(submission.status).toBe(SubmissionStatus.APPROVED_AUTOMATICALLY);
    });

    it.each([
      MeasurementRecognitionBehaviorEnum.MANUAL,
      MeasurementRecognitionBehaviorEnum.HIDDEN,
    ])(
      "should self-declare without creating submission when recognition behavior is %s",
      async (recognitionBehavior) => {
        await setRecognitionBehavior(recognitionBehavior);

        const { inventory } = await createSelfDeclarableInventory();

        const response = await app.inject({
          method: "POST",
          url: `/api/carbon-inventories/${inventory.id}/self-declare`,
        });

        expect(response.statusCode).toBe(200);

        const dbInventory = await prisma.carbonInventory.findUnique({
          where: { id: inventory.id },
        });
        expect(dbInventory?.isSelfDeclared).toBe(true);

        const submissionSubjectCI =
          await prisma.submissionSubjectCarbonInventory.findUnique({
            where: { carbonInventoryId: inventory.id },
          });
        expect(submissionSubjectCI).toBeNull();
      }
    );
  });

  describe("Validation errors", () => {
    it("should return 403 when inventory does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/carbon-inventories/999999/self-declare",
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 422 when inventory has no organizationId", async () => {
      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { year: 2024 }
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_MISSING_ORGANIZATION");
    });

    it("should return 422 when inventory has no year", async () => {
      const user = await getTestLoggedUser(prisma);
      const org = await createTestOrganization(prisma);

      const inventory = await createInventoryFromPattern(
        prisma,
        carbonInventoryPatterns.simplifiedDraft,
        { organizationId: org.id }
      );
      await createTestMembership(prisma, user.id, org.id);

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_MISSING_YEAR");
    });

    it("should return 422 when inventory is already self-declared", async () => {
      const { inventory } = await createSelfDeclarableInventory();

      // First self-declare succeeds
      const firstResponse = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });
      expect(firstResponse.statusCode).toBe(200);

      // Second self-declare fails
      const secondResponse = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(secondResponse.statusCode).toBe(422);
      const body = JSON.parse(secondResponse.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_ALREADY_SELF_DECLARED");
    });

    it("should return 422 when inventory has a pending submission (not DRAFT display status)", async () => {
      const { inventory, user } = await createSelfDeclarableInventory();

      // Create a PENDING calculation submission to move status away from DRAFT
      await createCarbonInventorySubmission(
        prisma,
        inventory.id,
        SubmissionType.CARBON_INVENTORY_CALCULATION,
        user.id
      );

      const response = await app.inject({
        method: "POST",
        url: `/api/carbon-inventories/${inventory.id}/self-declare`,
      });

      expect(response.statusCode).toBe(422);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("CARBON_INVENTORY_NOT_DRAFT_FOR_SELF_DECLARE");
    });
  });
});
