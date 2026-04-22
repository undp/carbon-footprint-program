import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  inject,
  vi,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { ApproveRequestResponse, ApproveRequestBody } from "@repo/types";
import { BadgeType, SubmissionFileType, SubmissionStatus } from "@repo/database";
import { randomUUID } from "crypto";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  cleanupTestFiles,
  createTestFile,
  createTestFileForBadge,
} from "@test/factories/fileFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

vi.mock("@/services/blobService.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/badge?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe("POST /api/admin/requests/:id/approve - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUser: User;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl);
    prisma = app.prisma;
    testUser = await getTestLoggedUser(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Happy path - Approve request successfully", () => {
    it("should approve a PENDING submission without review comments", async () => {
      // Setup: Create organization with PENDING submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Execute: Approve the submission
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApproveRequestResponse;
      expect(body).toEqual({});

      // Verify: Submission status updated to APPROVED
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.status).toBe(SubmissionStatus.APPROVED);
      expect(updatedSubmission!.reviewerId).toBe(testUser.id);
      expect(updatedSubmission!.updatedById).toBe(testUser.id);
      expect(updatedSubmission!.reviewComments).toBeNull();
    });

    it("should approve a PENDING submission with review comments", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: ApproveRequestBody = {
        reviewComments: "Approved with minor suggestions for improvement",
      };

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ApproveRequestResponse;
      expect(body).toEqual({});

      // Verify: Review comments saved
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.status).toBe(SubmissionStatus.APPROVED);
      expect(updatedSubmission!.reviewComments).toBe(
        "Approved with minor suggestions for improvement"
      );
      expect(updatedSubmission!.reviewerId).toBe(testUser.id);
    });

    it("should set reviewerId to current user when approving", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Verify initial state: no reviewer
      expect(submission.reviewerId).toBeNull();

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);

      // Verify: Reviewer set to current user
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.reviewerId).toBe(testUser.id);
    });

    it("should update updatedById to current user", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);

      // Verify
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.updatedById).toBe(testUser.id);
    });

    it("should attach revision and recognition files when UUIDs are repeated", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const revisionFile = await createTestFile(prisma, testUser.id);
      const recognitionFile = await createTestFile(prisma, testUser.id);

      const requestBody: ApproveRequestBody = {
        reviewFileUuids: [revisionFile.uuid, revisionFile.uuid],
        recognitionFileUuids: [recognitionFile.uuid, recognitionFile.uuid],
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const submissionFiles = await prisma.submissionFile.findMany({
        where: { submissionId: submission.id },
        include: { file: { select: { uuid: true } } },
        orderBy: { fileId: "asc" },
      });

      expect(submissionFiles).toHaveLength(2);
      expect(
        submissionFiles.map((submissionFile) => ({
          type: submissionFile.type,
          uuid: submissionFile.file.uuid,
        }))
      ).toEqual([
        {
          type: SubmissionFileType.REVIEW_ATTACHMENT,
          uuid: revisionFile.uuid,
        },
        {
          type: SubmissionFileType.RECOGNITION,
          uuid: recognitionFile.uuid,
        },
      ]);
    });
  });

  describe("Error cases", () => {
    it("should return 400 for non-existent submission", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${nonExistentId}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
      expect(body.message).toContain(nonExistentId);
    });

    it("should return 404 when any attachment UUID does not exist", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const revisionFile = await createTestFile(prisma, testUser.id);
      const missingUuid = randomUUID();

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {
          reviewFileUuids: [revisionFile.uuid, missingUuid],
        } satisfies ApproveRequestBody,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("MISSING_FILES");
      expect(body.message).toContain(missingUuid);

      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.status).toBe(SubmissionStatus.PENDING);

      const submissionFiles = await prisma.submissionFile.findMany({
        where: { submissionId: submission.id },
      });
      expect(submissionFiles).toHaveLength(0);
    });

    it("should return 400 when trying to approve an already APPROVED submission", async () => {
      // Setup: Create APPROVED submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Execute: Try to approve again
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
      expect(body.message).toContain(submission.id.toString());
    });

    it("should return 400 when trying to approve a REJECTED submission", async () => {
      // Setup: Create REJECTED submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.REJECTED,
        testUser.id,
        testUser.id,
        "Initial rejection"
      );

      // Execute: Try to approve rejected submission
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
      expect(body.message).toContain(submission.id.toString());
    });

    it("should return 400 for invalid submission ID format", async () => {
      const invalidId = "not-a-number";

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${invalidId}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Validation", () => {
    it("should accept request with empty review comments", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: ApproveRequestBody = {
        reviewComments: undefined,
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.status).toBe(SubmissionStatus.APPROVED);
    });

    it("should accept request with long review comments", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const longComment = "A".repeat(500); // Long comment
      const requestBody: ApproveRequestBody = {
        reviewComments: longComment,
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.reviewComments).toBe(longComment);
    });
  });

  describe("Concurrent operations", () => {
    it("should only allow one approval to succeed when multiple attempts are made", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Execute: Try to approve twice in quick succession
      const [response1, response2] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/admin/requests/${submission.id}/approve`,
          payload: {},
        }),
        app.inject({
          method: "POST",
          url: `/api/admin/requests/${submission.id}/approve`,
          payload: {},
        }),
      ]);

      // One should succeed (200), one should fail (409)
      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses).toEqual([200, 400]);

      // Verify final state: submission is APPROVED
      const finalSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(finalSubmission!.status).toBe(SubmissionStatus.APPROVED);
    });
  });

  describe("Badge behaviour when no ACTIVE badge exists (regression)", () => {
    it("should approve with badgeId=null when no ACTIVE ORGANIZATION_ACCREDITATION badge exists", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // Ensure zero active badges for ORGANIZATION_ACCREDITATION
      await prisma.badge.deleteMany({
        where: { type: BadgeType.ORGANIZATION_ACCREDITATION, status: "ACTIVE" },
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      expect(response.statusCode).toBe(200);

      const updated = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updated!.status).toBe(SubmissionStatus.APPROVED);
      expect(updated!.badgeId).toBeNull();
    });

    it("should not backfill badgeId after a badge is later activated", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      // No active badge — approve with badgeId = null
      await prisma.badge.deleteMany({
        where: { type: BadgeType.ORGANIZATION_ACCREDITATION, status: "ACTIVE" },
      });

      await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/approve`,
        payload: {},
      });

      // Now create and activate a badge for that type
      const { badge } = await createTestFileForBadge(
        prisma,
        testUser.id,
        BadgeType.ORGANIZATION_ACCREDITATION
      );

      // Confirm the approved submission's badgeId remains null
      const afterActivation = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(afterActivation!.badgeId).toBeNull();
      expect(afterActivation!.status).toBe(SubmissionStatus.APPROVED);

      // Cleanup the seeded badge so afterEach doesn't fail
      await prisma.badge.delete({ where: { id: badge.id } });
    });
  });

  describe("Multiple submissions", () => {
    it("should allow approving different submissions independently", async () => {
      // Setup: Create two different PENDING submissions
      const org1 = await createTestOrganization(prisma);
      const orgData1 = await createTestOrganizationData(prisma, org1.id);
      const { submission: submission1 } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData1.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

      const org2 = await createTestOrganization(prisma);
      const orgData2 = await createTestOrganizationData(prisma, org2.id);
      const { submission: submission2 } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData2.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

      // Execute: Approve both submissions
      const response1 = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission1.id}/approve`,
        payload: {},
      });

      const response2 = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission2.id}/approve`,
        payload: {},
      });

      // Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      // Verify both are approved
      const updatedSubmission1 = await prisma.submission.findUnique({
        where: { id: submission1.id },
      });
      const updatedSubmission2 = await prisma.submission.findUnique({
        where: { id: submission2.id },
      });

      expect(updatedSubmission1!.status).toBe(SubmissionStatus.APPROVED);
      expect(updatedSubmission2!.status).toBe(SubmissionStatus.APPROVED);
    });
  });
});
