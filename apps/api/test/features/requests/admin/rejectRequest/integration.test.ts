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
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { RejectRequestResponse, RejectRequestBody } from "@repo/types";
import { SubmissionFileType, SubmissionStatus } from "@repo/database";
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
} from "@test/factories/fileFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/admin/requests/:id/reject - Integration Tests", () => {
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

  describe("Happy path - Reject request successfully", () => {
    it("should reject a PENDING submission with review comments", async () => {
      // Setup: Create organization with PENDING submission
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: RejectRequestBody = {
        reviewComments: "Missing required documentation",
      };

      // Execute: Reject the submission
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as unknown as RejectRequestResponse;
      expect(body).toEqual({});

      // Verify: Submission status updated to REJECTED
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.status).toBe(SubmissionStatus.REJECTED);
      expect(updatedSubmission!.reviewerId).toBe(testUser.id);
      expect(updatedSubmission!.updatedById).toBe(testUser.id);
      expect(updatedSubmission!.reviewComments).toBe(
        "Missing required documentation"
      );
    });

    it("should set reviewerId to current user when rejecting", async () => {
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

      const requestBody: RejectRequestBody = {
        reviewComments: "Needs improvements",
      };

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
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

      const requestBody: RejectRequestBody = {
        reviewComments: "Incomplete information",
      };

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      // Verify
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.updatedById).toBe(testUser.id);
    });

    it("should save detailed rejection reasons", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const detailedReason = `
Rejection reasons:
1. Missing legal registration documents
2. Incomplete contact information
3. Business activities description is too vague
4. No proof of address provided
      `.trim();

      const requestBody: RejectRequestBody = {
        reviewComments: detailedReason,
      };

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      // Verify: Detailed comments saved
      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.reviewComments).toBe(detailedReason);
    });

    it("should attach revision files when UUIDs are repeated", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const revisionFile = await createTestFile(prisma, testUser.id);

      const requestBody: RejectRequestBody = {
        reviewComments: "Missing required documentation",
        revisionFileUuids: [revisionFile.uuid, revisionFile.uuid],
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const submissionFiles = await prisma.submissionFile.findMany({
        where: { submissionId: submission.id },
        include: { file: { select: { uuid: true } } },
      });

      expect(submissionFiles).toHaveLength(1);
      expect({
        type: submissionFiles[0].type,
        uuid: submissionFiles[0].file.uuid,
      }).toEqual({
        type: SubmissionFileType.REVISION_ATTACHMENT,
        uuid: revisionFile.uuid,
      });
    });
  });

  describe("Error cases", () => {
    it("should return 400 for non-existent submission", async () => {
      const nonExistentId = "999999";

      const requestBody: RejectRequestBody = {
        reviewComments: "This should fail",
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${nonExistentId}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
    });

    it("should return 404 when any revision attachment UUID does not exist", async () => {
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

      const requestBody: RejectRequestBody = {
        reviewComments: "Missing required documentation",
        revisionFileUuids: [revisionFile.uuid, missingUuid],
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as unknown as ApiErrorResponse;
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

    it("should return 400 when trying to reject an already APPROVED submission", async () => {
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

      const requestBody: RejectRequestBody = {
        reviewComments: "This should fail",
      };

      // Execute: Try to reject approved submission
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
      expect(body.message).toContain(submission.id.toString());
    });

    it("should return 400 when trying to reject an already REJECTED submission", async () => {
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

      const requestBody: RejectRequestBody = {
        reviewComments: "This should fail",
      };

      // Execute: Try to reject again
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as unknown as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_UPDATE_ERROR");
      expect(body.message).toContain(submission.id.toString());
    });

    it("should return 400 when reviewComments is empty string", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: RejectRequestBody = {
        reviewComments: "",
      };

      // Execute: Try to reject with empty comments
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return 400 when reviewComments is only whitespace", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: RejectRequestBody = {
        reviewComments: "   ",
      };

      // Execute: Try to reject with whitespace-only comments
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Validation", () => {
    it("should accept request with long review comments", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const longComment = "Reason: " + "A".repeat(1000); // Long comment
      const requestBody: RejectRequestBody = {
        reviewComments: longComment,
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.reviewComments).toBe(longComment);
    });

    it("should accept review comments with special characters", async () => {
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const specialCharsComment =
        "Rejection: Missing info (e.g., docs & certificates) - 50% incomplete!";
      const requestBody: RejectRequestBody = {
        reviewComments: specialCharsComment,
      };

      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      const updatedSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(updatedSubmission!.reviewComments).toBe(specialCharsComment);
    });
  });

  describe("Concurrent operations", () => {
    it("should only allow one rejection to succeed when multiple attempts are made", async () => {
      // Setup
      const org = await createTestOrganization(prisma);
      const orgData = await createTestOrganizationData(prisma, org.id);
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

      const requestBody: RejectRequestBody = {
        reviewComments: "Rejection reason",
      };

      // Execute: Try to reject twice in quick succession
      const [response1, response2] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/admin/requests/${submission.id}/reject`,
          payload: requestBody,
        }),
        app.inject({
          method: "POST",
          url: `/api/admin/requests/${submission.id}/reject`,
          payload: requestBody,
        }),
      ]);

      // One should succeed (200), one should fail (409)
      const statuses = [response1.statusCode, response2.statusCode].sort();
      expect(statuses).toEqual([200, 400]);

      // Verify final state: submission is REJECTED
      const finalSubmission = await prisma.submission.findUnique({
        where: { id: submission.id },
      });
      expect(finalSubmission!.status).toBe(SubmissionStatus.REJECTED);
    });
  });

  describe("Multiple submissions", () => {
    it("should allow rejecting different submissions independently", async () => {
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

      const requestBody1: RejectRequestBody = {
        reviewComments: "Rejection reason for org 1",
      };
      const requestBody2: RejectRequestBody = {
        reviewComments: "Rejection reason for org 2",
      };

      // Execute: Reject both submissions
      const response1 = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission1.id}/reject`,
        payload: requestBody1,
      });

      const response2 = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission2.id}/reject`,
        payload: requestBody2,
      });

      // Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      // Verify both are rejected with correct comments
      const updatedSubmission1 = await prisma.submission.findUnique({
        where: { id: submission1.id },
      });
      const updatedSubmission2 = await prisma.submission.findUnique({
        where: { id: submission2.id },
      });

      expect(updatedSubmission1!.status).toBe(SubmissionStatus.REJECTED);
      expect(updatedSubmission1!.reviewComments).toBe(
        "Rejection reason for org 1"
      );
      expect(updatedSubmission2!.status).toBe(SubmissionStatus.REJECTED);
      expect(updatedSubmission2!.reviewComments).toBe(
        "Rejection reason for org 2"
      );
    });
  });

  describe("Workflow scenarios", () => {
    it("should allow rejecting after a previous submission was approved", async () => {
      const org = await createTestOrganization(prisma);

      // First submission: APPROVED
      const orgData1 = await createTestOrganizationData(prisma, org.id, {
        legalName: "Original Name",
      });
      await createTestOrganizationDataSubmission(
        prisma,
        orgData1.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );

      // Second submission: PENDING re-accreditation
      const orgData2 = await createTestOrganizationData(prisma, org.id, {
        legalName: "Updated Name",
      });
      const { submission: submission2 } =
        await createTestOrganizationDataSubmission(
          prisma,
          orgData2.id,
          SubmissionStatus.PENDING,
          testUser.id
        );

      const requestBody: RejectRequestBody = {
        reviewComments: "Updated information is not acceptable",
      };

      // Execute: Reject the re-accreditation
      const response = await app.inject({
        method: "POST",
        url: `/api/admin/requests/${submission2.id}/reject`,
        payload: requestBody,
      });

      expect(response.statusCode).toBe(200);

      // Verify: Second submission is rejected
      const rejectedSubmission = await prisma.submission.findUnique({
        where: { id: submission2.id },
      });
      expect(rejectedSubmission!.status).toBe(SubmissionStatus.REJECTED);
      expect(rejectedSubmission!.reviewComments).toBe(
        "Updated information is not acceptable"
      );
    });
  });
});
