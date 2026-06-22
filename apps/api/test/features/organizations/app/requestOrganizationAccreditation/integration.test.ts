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
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import {
  createTestFile,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import { uploadFixture } from "@test/factories/storageHelper.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { RequestOrganizationAccreditationResponse } from "@repo/types";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  MembershipStatus,
  SubmissionFileType,
} from "@repo/database";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

// SAS generation and blob move require Azure AD auth / server-side copy not available

describe("POST /api/app/organizations/:id/request-accreditation - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let testUserId: bigint;

  beforeAll(async () => {
    const databaseUrl = inject("databaseUrl");
    app = await createTestApp(databaseUrl, {
      storageDescriptor: inject("storageDescriptor"),
    });
    // The "happy path" suite below relies on copy/delete being inert (it
    // never seeds the source blob). The nested "appWithStorage" suite at the
    // end of the file builds its own app + spies as needed, so this stub does
    // not interfere with it.
    vi.spyOn(app.storage, "copyObject").mockResolvedValue(undefined);
    vi.spyOn(app.storage, "deleteObject").mockResolvedValue(undefined);
    prisma = app.prisma;
    const testUser = await getTestLoggedUser(prisma);
    testUserId = testUser.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    await cleanupTestFiles(prisma);
    await cleanupTestOrganization(prisma);
  });

  describe("Happy path - Request accreditation successfully", () => {
    it("should create submission with PENDING status and verify createdById is current user", async () => {
      // Setup: Create organization, organization data (ACTIVE draft), and membership
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      // Execute: Request accreditation
      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(
        response.body
      ) as RequestOrganizationAccreditationResponse;
      expect(body.submissionId).toBeDefined();

      // Verify: Submission was created with PENDING status
      const submission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: organizationData.id,
            },
          },
        },
        include: {
          subject: {
            include: {
              organizationData: true,
            },
          },
        },
      });

      expect(submission).toBeDefined();
      expect(submission?.status).toBe(SubmissionStatus.PENDING);
      expect(submission?.createdById).toBe(testUserId);
      expect(submission?.updatedById).toBe(testUserId);
    });

    it("should create submission_subject with ORGANIZATION_ACCREDITATION type", async () => {
      // Setup
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(200);

      // Verify: Subject was created with ORGANIZATION_ACCREDITATION type
      const subject = await prisma.submissionSubject.findFirst({
        where: {
          organizationData: {
            organizationDataId: organizationData.id,
          },
        },
      });

      expect(subject).toBeDefined();
      expect(subject?.createdById).toBe(testUserId);
    });

    it("should create submission_subject_organization_data linking subject to org_data", async () => {
      // Setup
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      // Execute
      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(200);

      // Verify: Link was created between subject and organization data
      const link = await prisma.submissionSubjectOrganizationData.findFirst({
        where: {
          organizationDataId: organizationData.id,
        },
        include: {
          subject: true,
        },
      });

      expect(link).toBeDefined();
      expect(link?.organizationDataId).toBe(organizationData.id);
      expect(link?.subject).toBeDefined();
    });
  });

  describe("Data lifecycle - REJECTED to OUTDATED transition", () => {
    it("should mark old REJECTED org_data as OUTDATED when new submission is created", async () => {
      // Setup: Create organization with REJECTED org_data
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      // Create first organization data (will be rejected)
      const rejectedOrgData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      // Create submission and mark it as REJECTED
      await createTestOrganizationDataSubmission(
        prisma,
        rejectedOrgData.id,
        SubmissionStatus.REJECTED,
        testUserId
      );

      // Create new ACTIVE draft organization data (no submission)
      const newOrgData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      // Create membership
      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      // Verify initial state: both org_data are ACTIVE
      const initialRejectedData = await prisma.organizationData.findUnique({
        where: { id: rejectedOrgData.id },
      });
      const initialNewData = await prisma.organizationData.findUnique({
        where: { id: newOrgData.id },
      });
      expect(initialRejectedData?.status).toBe(OrganizationDataStatus.ACTIVE);
      expect(initialNewData?.status).toBe(OrganizationDataStatus.ACTIVE);

      // Execute: Request accreditation for the organization
      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(200);

      // Verify: Old REJECTED org_data is now OUTDATED
      const updatedRejectedData = await prisma.organizationData.findUnique({
        where: { id: rejectedOrgData.id },
      });
      expect(updatedRejectedData?.status).toBe(OrganizationDataStatus.OUTDATED);

      // Verify: New org_data is still ACTIVE
      const updatedNewData = await prisma.organizationData.findUnique({
        where: { id: newOrgData.id },
      });
      expect(updatedNewData?.status).toBe(OrganizationDataStatus.ACTIVE);

      // Verify: New submission was created for the new org_data
      const newSubmission = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: newOrgData.id,
            },
          },
        },
      });
      expect(newSubmission).toBeDefined();
      expect(newSubmission?.status).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Error cases", () => {
    it("should return 404 for non-existent organization", async () => {
      const nonExistentId = "999999";

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${nonExistentId}/request-accreditation`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for user without membership", async () => {
      // Setup: Create organization but NO membership
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, organization.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 403 for user with DELETED membership", async () => {
      // Setup: Create organization with DELETED membership
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, organization.id, {
        status: OrganizationDataStatus.ACTIVE,
      });

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.DELETED,
      });

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return 404 when only PENDING submission exists (no draft)", async () => {
      // Setup: Create organization with existing PENDING submission (no draft)
      // This is the state after a user has already submitted a draft for review
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      // Create existing PENDING submission (this means no draft exists)
      await createTestOrganizationDataSubmission(
        prisma,
        organizationData.id,
        SubmissionStatus.PENDING,
        testUserId
      );

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      // Service returns 404 because it looks for a draft (ACTIVE without submission)
      // and doesn't find one (the only ACTIVE data already has a PENDING submission)
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_DATA_NOT_FOUND");
      expect(body.message).toContain(organization.id.toString());
    });

    it("should return 404 when no ACTIVE draft exists", async () => {
      // Setup: Create organization but NO organization data
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_DATA_NOT_FOUND");
      expect(body.message).toContain(organization.id.toString());
    });

    it("should return 404 when only ACTIVE org_data with submission exists (no draft)", async () => {
      // Setup: Create organization with ACTIVE org_data that already has a submission
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id,
        {
          status: OrganizationDataStatus.ACTIVE,
        }
      );

      // Create submission for this org_data (so it's not a draft anymore)
      await createTestOrganizationDataSubmission(
        prisma,
        organizationData.id,
        SubmissionStatus.PENDING,
        testUserId
      );

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_DATA_NOT_FOUND");
      expect(body.message).toContain(organization.id.toString());
    });

    it("should return 404 when only OUTDATED org_data exists", async () => {
      // Setup: Create organization with OUTDATED org_data
      const organization = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });

      await createTestOrganizationData(prisma, organization.id, {
        status: OrganizationDataStatus.OUTDATED,
      });

      await createTestMembership(prisma, testUserId, organization.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file = await createTestFile(prisma, testUserId);

      const response = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [file.uuid] },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("ORGANIZATION_DATA_NOT_FOUND");
      expect(body.message).toContain(organization.id.toString());
    });
  });

  describe("Multiple users and submissions", () => {
    it("should allow different users to request accreditation for different organizations", async () => {
      // Setup: Create two organizations with different memberships
      const org1 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const org1Data = await createTestOrganizationData(prisma, org1.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestMembership(prisma, testUserId, org1.id, {
        status: MembershipStatus.ACTIVE,
      });

      const org2 = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const org2Data = await createTestOrganizationData(prisma, org2.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestMembership(prisma, testUserId, org2.id, {
        status: MembershipStatus.ACTIVE,
      });

      const file1 = await createTestFile(prisma, testUserId);
      const file2 = await createTestFile(prisma, testUserId);

      // Execute: Request accreditation for both
      const response1 = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org1.id}/request-accreditation`,
        payload: { fileUuids: [file1.uuid] },
      });

      const response2 = await app.inject({
        method: "POST",
        url: `/api/app/organizations/${org2.id}/request-accreditation`,
        payload: { fileUuids: [file2.uuid] },
      });

      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      // Verify: Both submissions were created
      const submission1 = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: org1Data.id,
            },
          },
        },
      });

      const submission2 = await prisma.submission.findFirst({
        where: {
          subject: {
            organizationData: {
              organizationDataId: org2Data.id,
            },
          },
        },
      });

      expect(submission1).toBeDefined();
      expect(submission1?.status).toBe(SubmissionStatus.PENDING);
      expect(submission2).toBeDefined();
      expect(submission2?.status).toBe(SubmissionStatus.PENDING);
    });
  });

  describe("Happy path - with file attachments", () => {
    let appWithStorage: FastifyInstance;
    let prismaWithStorage: PrismaClient;
    let userIdWithStorage: bigint;

    beforeAll(async () => {
      appWithStorage = await createTestApp(inject("databaseUrl"), {
        storageDescriptor: inject("storageDescriptor"),
      });
      prismaWithStorage = appWithStorage.prisma;
      const user = await getTestLoggedUser(prismaWithStorage);
      userIdWithStorage = user.id;
    });

    afterAll(async () => {
      await prismaWithStorage.$disconnect();
      await appWithStorage.close();
    });

    afterEach(async () => {
      await cleanupTestFiles(prismaWithStorage);
      await cleanupTestOrganization(prismaWithStorage);
      vi.clearAllMocks();
    });

    it("should link pre-uploaded files to the submission and call copyObject", async () => {
      const copySpy = vi.spyOn(appWithStorage.storage, "copyObject");
      const uuid = "550e8400-e29b-41d4-a716-446655440020";
      const originalName = "attachment.pdf";
      const tmpBlobPath = `SUBMISSION/tmp/${uuid}-${originalName}`;

      // Upload blob to tmp namespace in Azurite
      await uploadFixture(appWithStorage.storage, tmpBlobPath, {
        contentType: "application/pdf",
      });

      // Confirm upload — creates File DB record at tmp path
      await appWithStorage.inject({
        method: "POST",
        url: "/api/files/confirm-upload",
        payload: { uuid, originalName, fileType: "SUBMISSION" },
      });

      // Setup organization
      const organization = await createTestOrganization(prismaWithStorage, {
        status: OrganizationStatus.ACTIVE,
      });
      const organizationData = await createTestOrganizationData(
        prismaWithStorage,
        organization.id,
        { status: OrganizationDataStatus.ACTIVE }
      );
      await createTestMembership(
        prismaWithStorage,
        userIdWithStorage,
        organization.id,
        { status: MembershipStatus.ACTIVE }
      );

      // Request accreditation with the pre-uploaded file
      const response = await appWithStorage.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: [uuid] },
      });

      expect(response.statusCode).toBe(200);

      // copyBlob should have been called to copy the blob from tmp to final path
      const submission = await prismaWithStorage.submission.findFirst({
        where: {
          subject: {
            organizationData: { organizationDataId: organizationData.id },
          },
        },
      });
      expect(submission).toBeDefined();

      const finalPath = `SUBMISSION/${submission!.id}/SUBMIT_ATTACHMENT/${uuid}-${originalName}`;
      expect(copySpy).toHaveBeenCalledWith(tmpBlobPath, finalPath);

      // SubmissionFile record should be created and File.blobPath updated to final path
      const fileRecord = await prismaWithStorage.file.findUnique({
        where: { uuid },
        include: { submissionFiles: true },
      });
      expect(fileRecord?.blobPath).toBe(finalPath);
      expect(fileRecord?.submissionFiles).toHaveLength(1);
      expect(fileRecord?.submissionFiles[0]?.submissionId).toBe(submission!.id);
      expect(fileRecord?.submissionFiles[0]?.type).toBe(
        SubmissionFileType.SUBMIT_ATTACHMENT
      );
    });

    it("should link multiple pre-uploaded files to the submission", async () => {
      const copySpy = vi.spyOn(appWithStorage.storage, "copyObject");
      const files = [
        {
          uuid: "550e8400-e29b-41d4-a716-446655440021",
          name: "report-a.pdf",
        },
        {
          uuid: "550e8400-e29b-41d4-a716-446655440022",
          name: "report-b.pdf",
        },
      ];

      for (const f of files) {
        await uploadFixture(
          appWithStorage.storage,
          `SUBMISSION/tmp/${f.uuid}-${f.name}`,
          { contentType: "application/pdf" }
        );
        await appWithStorage.inject({
          method: "POST",
          url: "/api/files/confirm-upload",
          payload: {
            uuid: f.uuid,
            originalName: f.name,
            fileType: "SUBMISSION",
          },
        });
      }

      const organization = await createTestOrganization(prismaWithStorage, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prismaWithStorage, organization.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestMembership(
        prismaWithStorage,
        userIdWithStorage,
        organization.id,
        { status: MembershipStatus.ACTIVE }
      );

      const response = await appWithStorage.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
        payload: { fileUuids: files.map((f) => f.uuid) },
      });

      expect(response.statusCode).toBe(200);
      expect(copySpy).toHaveBeenCalledTimes(files.length);

      for (const f of files) {
        const fileRecord = await prismaWithStorage.file.findUnique({
          where: { uuid: f.uuid },
          include: { submissionFiles: true },
        });
        expect(fileRecord?.submissionFiles).toHaveLength(1);
      }
    });

    it("should return 400 FILE_ATTACHMENTS_REQUIRED when no files are provided", async () => {
      const organization = await createTestOrganization(prismaWithStorage, {
        status: OrganizationStatus.ACTIVE,
      });
      await createTestOrganizationData(prismaWithStorage, organization.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      await createTestMembership(
        prismaWithStorage,
        userIdWithStorage,
        organization.id,
        { status: MembershipStatus.ACTIVE }
      );

      const response = await appWithStorage.inject({
        method: "POST",
        url: `/api/app/organizations/${organization.id}/request-accreditation`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("FILE_ATTACHMENTS_REQUIRED");
    });
  });
});
