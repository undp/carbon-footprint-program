import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
  vi,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import { createTestOrganization } from "@test/factories/organizationFactory.js";
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionFileType,
  FileStatus,
} from "@repo/database";
import type {
  RequestSubmissionUploadResponse,
  ConfirmSubmissionUploadResponse,
  GetSubmissionFilesResponse,
} from "@repo/types";

// generateWriteSasUrl uses getUserDelegationKey which requires Azure AD auth —
// not supported by Azurite's shared-key mode. We mock the SAS generation so
// the full request-upload → confirm-upload → get-files flow can run end-to-end
// against the real Azurite container.
vi.mock("@/features/files/helpers/sasHelper.js", () => ({
  generateWriteSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
  generateReadSasUrl: vi.fn().mockResolvedValue({
    url: "https://mock.blob.core.windows.net/test/file?sig=mock",
    expiresAt: new Date("2099-12-31T23:59:59.000Z"),
  }),
}));

describe(
  "Submission files — Full upload flow: request-upload → upload → confirm-upload → get files",
  () => {
    let app: FastifyInstance;
    let prisma: PrismaClient;
    let testUser: User;

    beforeAll(async () => {
      app = await createTestApp(inject("databaseUrl"), {
        storageConnectionString: inject("storageConnectionString"),
        storageContainerName: inject("storageContainerName"),
      });
      prisma = app.prisma;
      testUser = await getTestLoggedUser(prisma);
    });

    afterAll(async () => {
      await prisma.$disconnect();
      await app.close();
    });

    beforeEach(async () => {
      await cleanupTestFiles(prisma);
      await cleanupTestOrganization(prisma);
    });

    async function buildSubmission() {
      const org = await createTestOrganization(prisma, {
        status: OrganizationStatus.ACTIVE,
      });
      const orgData = await createTestOrganizationData(prisma, org.id, {
        status: OrganizationDataStatus.ACTIVE,
      });
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        orgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );
      return submission;
    }

    /**
     * Simulates the client uploading the file to blob storage after receiving
     * a SAS URL. Uses the Azurite connection string directly.
     */
    async function uploadBlobToAzurite(
      blobPath: string,
      content = "test file content"
    ) {
      await app.blobStorage!
        .getBlockBlobClient(blobPath)
        .upload(content, Buffer.byteLength(content), {
          blobHTTPHeaders: { blobContentType: "application/pdf" },
        });
    }

    it("should complete the full lifecycle for an ATTACHMENT file", async () => {
      const submission = await buildSubmission();
      const originalName = "report.pdf";
      const submissionFileType = "ATTACHMENT";

      // Step 1 – Request an upload URL
      const requestResponse = await app.inject({
        method: "POST",
        url: `/api/files/submission/${submission.id}/request-upload`,
        payload: { originalName, submissionFileType },
      });

      expect(requestResponse.statusCode).toBe(200);
      const { uuid, uploadUrl, expiresAt } = JSON.parse(requestResponse.body) as RequestSubmissionUploadResponse;
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(uploadUrl).toBeTruthy();
      expect(expiresAt).toBeTruthy();

      // Step 2 – Simulate the client uploading the file. The blob path mirrors
      // buildBlobPath({ fileType: "SUBMISSION", groupKey: submissionId,
      //   subPath: submissionFileType, uuid, name: originalName }).
      const blobPath = `SUBMISSION/${submission.id}/${submissionFileType}/${uuid}-${originalName}`;
      await uploadBlobToAzurite(blobPath);

      // Step 3 – Confirm the upload
      const confirmResponse = await app.inject({
        method: "POST",
        url: `/api/files/submission/${submission.id}/confirm-upload`,
        payload: { uuid, originalName, submissionFileType },
      });

      expect(confirmResponse.statusCode).toBe(201);
      const confirmedFile = JSON.parse(confirmResponse.body) as ConfirmSubmissionUploadResponse;
      expect(confirmedFile.uuid).toBe(uuid);
      expect(confirmedFile.originalName).toBe(originalName);
      expect(confirmedFile.mimeType).toBe("application/pdf");
      expect(confirmedFile.sizeBytes).toBeGreaterThan(0);
      expect(confirmedFile.status).toBe(FileStatus.ACTIVE);

      // Step 4 – Verify the file appears when listing submission files
      const listResponse = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(listResponse.statusCode).toBe(200);
      const files = JSON.parse(listResponse.body) as GetSubmissionFilesResponse;
      expect(files).toHaveLength(1);
      expect(files[0].uuid).toBe(uuid);

      // Step 5 – Verify the DB records were created correctly
      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      expect(fileRecord).toBeDefined();
      expect(fileRecord?.createdById).toBe(testUser.id);

      const submissionFileRecord = await prisma.submissionFile.findUnique({
        where: { fileId: fileRecord!.id },
      });
      expect(submissionFileRecord).toBeDefined();
      expect(submissionFileRecord?.submissionId).toBe(submission.id);
      expect(submissionFileRecord?.type).toBe(SubmissionFileType.ATTACHMENT);
    });

    it("should complete the full lifecycle for a RECOGNITION file", async () => {
      const submission = await buildSubmission();
      const originalName = "certificate.pdf";
      const submissionFileType = "RECOGNITION";

      const { body: reqBody } = await app.inject({
        method: "POST",
        url: `/api/files/submission/${submission.id}/request-upload`,
        payload: { originalName, submissionFileType },
      });
      const { uuid } = JSON.parse(reqBody) as RequestSubmissionUploadResponse;

      const blobPath = `SUBMISSION/${submission.id}/${submissionFileType}/${uuid}-${originalName}`;
      await uploadBlobToAzurite(blobPath);

      const confirmResponse = await app.inject({
        method: "POST",
        url: `/api/files/submission/${submission.id}/confirm-upload`,
        payload: { uuid, originalName, submissionFileType },
      });

      expect(confirmResponse.statusCode).toBe(201);

      const fileRecord = await prisma.file.findUnique({ where: { uuid } });
      const submissionFileRecord = await prisma.submissionFile.findUnique({
        where: { fileId: fileRecord!.id },
      });
      expect(submissionFileRecord?.type).toBe(SubmissionFileType.RECOGNITION);
    });

    it("should allow multiple files to be uploaded on the same submission", async () => {
      const submission = await buildSubmission();
      const files = ["report-a.pdf", "report-b.pdf"];

      for (const name of files) {
        const { body: reqBody } = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: { originalName: name, submissionFileType: "ATTACHMENT" },
        });
        const { uuid } = JSON.parse(reqBody) as RequestSubmissionUploadResponse;
        await uploadBlobToAzurite(
          `SUBMISSION/${submission.id}/ATTACHMENT/${uuid}-${name}`
        );
        await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: {
            uuid,
            originalName: name,
            submissionFileType: "ATTACHMENT",
          },
        });
      }

      const listResponse = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(listResponse.statusCode).toBe(200);
      expect(JSON.parse(listResponse.body) as GetSubmissionFilesResponse).toHaveLength(2);
    });
  }
);
