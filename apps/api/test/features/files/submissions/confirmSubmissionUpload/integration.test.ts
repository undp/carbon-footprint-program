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
import { uploadBlobToAzurite } from "@test/factories/blobHelper.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionFileType,
  FileStatus,
} from "@repo/database";
import type { ConfirmSubmissionUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

// sasHelper is mocked so the confirm handler can reach the actual blob-check
// logic without triggering getUserDelegationKey calls.
vi.mock("@/features/files/helpers/sasHelper.js", () => ({
  generateWriteSasUrl: vi.fn(),
  generateReadSasUrl: vi.fn(),
}));

describe(
  "POST /api/files/submission/:submissionId/confirm-upload - Integration Tests",
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

    describe("Happy path", () => {
      it("should create file and submission-file DB records when blob exists", async () => {
        const submission = await buildSubmission();
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        const originalName = "report.pdf";
        const submissionFileType = "ATTACHMENT";

        const blobPath = `SUBMISSION/${submission.id}/${submissionFileType}/${uuid}-${originalName}`;
        await uploadBlobToAzurite(app.blobStorage!, blobPath, { contentType: "application/pdf" });

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: { uuid, originalName, submissionFileType },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body) as ConfirmSubmissionUploadResponse;
        expect(body.uuid).toBe(uuid);
        expect(body.originalName).toBe(originalName);
        expect(body.mimeType).toBe("application/pdf");
        expect(body.sizeBytes).toBeGreaterThan(0);
        expect(body.status).toBe(FileStatus.ACTIVE);
      });

      it("should persist the correct metadata in the database", async () => {
        const submission = await buildSubmission();
        const uuid = "550e8400-e29b-41d4-a716-446655440001";
        const originalName = "document.pdf";
        const submissionFileType = "RECOGNITION";

        const blobPath = `SUBMISSION/${submission.id}/${submissionFileType}/${uuid}-${originalName}`;
        await uploadBlobToAzurite(app.blobStorage!, blobPath, { contentType: "application/pdf" });

        await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: { uuid, originalName, submissionFileType },
        });

        const fileRecord = await prisma.file.findUnique({ where: { uuid } });
        expect(fileRecord).toBeDefined();
        expect(fileRecord?.originalName).toBe(originalName);
        expect(fileRecord?.createdById).toBe(testUser.id);

        const submissionFileRecord = await prisma.submissionFile.findUnique({
          where: { fileId: fileRecord!.id },
        });
        expect(submissionFileRecord).toBeDefined();
        expect(submissionFileRecord?.submissionId).toBe(submission.id);
        expect(submissionFileRecord?.type).toBe(SubmissionFileType.RECOGNITION);
      });
    });

    describe("Error cases", () => {
      it("should return 404 when submission does not exist", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/999999/confirm-upload`,
          payload: {
            uuid: "550e8400-e29b-41d4-a716-446655440002",
            originalName: "file.pdf",
            submissionFileType: "ATTACHMENT",
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("FILE_TYPE_NOT_FOUND");
      });

      it("should return 404 when the blob does not exist in storage", async () => {
        const submission = await buildSubmission();

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: {
            uuid: "550e8400-e29b-41d4-a716-446655440003",
            originalName: "ghost.pdf",
            submissionFileType: "ATTACHMENT",
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("FILE_NOT_FOUND");
      });

      it("should return 400 when uuid is not a valid UUID", async () => {
        const submission = await buildSubmission();

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: {
            uuid: "not-a-uuid",
            originalName: "file.pdf",
            submissionFileType: "ATTACHMENT",
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe(VALIDATION_ERROR_CODE);
      });

      it("should return 400 when required body fields are missing", async () => {
        const submission = await buildSubmission();

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/confirm-upload`,
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe(VALIDATION_ERROR_CODE);
      });
    });
  }
);
