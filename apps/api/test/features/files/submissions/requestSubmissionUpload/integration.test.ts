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
import { cleanupTestOrganization } from "@test/factories/organizationFactory.js";
import { buildOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import { cleanupTestFiles } from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import type { RequestSubmissionUploadResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

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
  "POST /api/files/submission/:submissionId/request-upload - Integration Tests",
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


    describe("Happy path", () => {
      it("should return 200 with uuid, uploadUrl and expiresAt", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: {
            originalName: "report.pdf",
            submissionFileType: "ATTACHMENT",
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body) as RequestSubmissionUploadResponse;
        expect(body.uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
        );
        expect(body.uploadUrl).toBeTruthy();
        expect(body.expiresAt).toBeTruthy();
      });

      it("should work with RECOGNITION file type", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: {
            originalName: "certificate.pdf",
            submissionFileType: "RECOGNITION",
          },
        });

        expect(response.statusCode).toBe(200);
      });

      it("should generate a different uuid on each call", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);
        const payload = {
          originalName: "file.pdf",
          submissionFileType: "ATTACHMENT",
        };

        const r1 = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload,
        });
        const r2 = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload,
        });

        expect((JSON.parse(r1.body) as RequestSubmissionUploadResponse).uuid).not.toBe(
          (JSON.parse(r2.body) as RequestSubmissionUploadResponse).uuid
        );
      });
    });

    describe("Error cases", () => {
      it("should return 404 when submission does not exist", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/999999/request-upload`,
          payload: {
            originalName: "file.pdf",
            submissionFileType: "ATTACHMENT",
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe("FILE_TYPE_NOT_FOUND");
        expect(body.message).toContain("999999");
      });

      it("should return 400 when originalName is missing", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: { submissionFileType: "ATTACHMENT" },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe(VALIDATION_ERROR_CODE);
      });

      it("should return 400 when submissionFileType is missing", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: { originalName: "file.pdf" },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe(VALIDATION_ERROR_CODE);
      });

      it("should return 400 when submissionFileType is invalid", async () => {
        const submission = await buildOrganizationDataSubmission(prisma, testUser.id);

        const response = await app.inject({
          method: "POST",
          url: `/api/files/submission/${submission.id}/request-upload`,
          payload: { originalName: "file.pdf", submissionFileType: "INVALID" },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body) as ApiErrorResponse;
        expect(body.code).toBe(VALIDATION_ERROR_CODE);
      });
    });
  }
);
