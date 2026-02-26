import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  inject,
} from "vitest";
import { createTestApp } from "@test/factories/appFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import {
  createTestOrganization,
  cleanupTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import {
  createTestFileForSubmission,
  cleanupTestFiles,
} from "@test/factories/fileFactory.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import {
  OrganizationStatus,
  OrganizationDataStatus,
  SubmissionStatus,
  SubmissionFileType,
  FileStatus,
} from "@repo/database";
import type { GetSubmissionFilesResponse } from "@repo/types";
import {
  type ApiErrorResponse,
  VALIDATION_ERROR_CODE,
} from "@/commonSchemas/errors.js";

describe("GET /api/files/submission/:submissionId - Integration Tests", () => {
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
    it("should return an empty array when submission has no files", async () => {
      const submission = await buildSubmission();

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([]);
    });

    it("should return all files for the given submission", async () => {
      const submission = await buildSubmission();
      const { file } = await createTestFileForSubmission(
        prisma,
        testUser.id,
        submission.id
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubmissionFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(file.uuid);
      expect(body[0].originalName).toBe(file.originalName);
      expect(body[0].mimeType).toBe(file.mimeType);
      expect(body[0].sizeBytes).toBe(file.sizeBytes);
      expect(body[0].status).toBe(FileStatus.ACTIVE);
    });

    it("should not return files belonging to other submissions", async () => {
      const sub1 = await buildSubmission();
      const sub2 = await buildSubmission();

      await createTestFileForSubmission(prisma, testUser.id, sub1.id);

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${sub2.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(0);
    });
  });

  describe("Filter by submissionFileType", () => {
    it("should return only files matching the given submissionFileType", async () => {
      const submission = await buildSubmission();

      const { file: attachment } = await createTestFileForSubmission(
        prisma,
        testUser.id,
        submission.id,
        { type: SubmissionFileType.ATTACHMENT }
      );
      await createTestFileForSubmission(prisma, testUser.id, submission.id, {
        type: SubmissionFileType.RECOGNITION,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}?submissionFileType=ATTACHMENT`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubmissionFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(attachment.uuid);
    });

    it("should return all files when submissionFileType filter is omitted", async () => {
      const submission = await buildSubmission();

      await createTestFileForSubmission(prisma, testUser.id, submission.id, {
        type: SubmissionFileType.ATTACHMENT,
      });
      await createTestFileForSubmission(prisma, testUser.id, submission.id, {
        type: SubmissionFileType.RECOGNITION,
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toHaveLength(2);
    });
  });

  describe("Filter by file status", () => {
    it("should return only ACTIVE files by default", async () => {
      const submission = await buildSubmission();

      await createTestFileForSubmission(prisma, testUser.id, submission.id, {
        fileOverrides: { status: FileStatus.DELETED },
      });
      const { file: active } = await createTestFileForSubmission(
        prisma,
        testUser.id,
        submission.id,
        { fileOverrides: { status: FileStatus.ACTIVE } }
      );

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubmissionFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(active.uuid);
    });

    it("should return DELETED files when status=DELETED is requested", async () => {
      const submission = await buildSubmission();

      const { file: deleted } = await createTestFileForSubmission(
        prisma,
        testUser.id,
        submission.id,
        { fileOverrides: { status: FileStatus.DELETED } }
      );
      await createTestFileForSubmission(prisma, testUser.id, submission.id, {
        fileOverrides: { status: FileStatus.ACTIVE },
      });

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}?status=DELETED`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as GetSubmissionFilesResponse;
      expect(body).toHaveLength(1);
      expect(body[0].uuid).toBe(deleted.uuid);
    });
  });

  describe("Error cases", () => {
    it("should return 404 when submission does not exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/999999`,
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe("SUBMISSION_NOT_FOUND");
      expect(body.message).toContain("999999");
    });

    it("should return 400 for an invalid status query param", async () => {
      const submission = await buildSubmission();

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}?status=INVALID`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });

    it("should return 400 for an invalid submissionFileType query param", async () => {
      const submission = await buildSubmission();

      const response = await app.inject({
        method: "GET",
        url: `/api/files/submission/${submission.id}?submissionFileType=INVALID`,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body) as ApiErrorResponse;
      expect(body.code).toBe(VALIDATION_ERROR_CODE);
    });
  });
});
