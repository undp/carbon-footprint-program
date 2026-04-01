import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  inject,
  it,
} from "vitest";
import type { FastifyInstance } from "fastify";
import type { PrismaClient, User } from "@repo/database";
import { SubmissionFileType, SubmissionStatus } from "@repo/database";
import type {
  ReviewSubmissionBody,
  ReviewSubmissionResponse,
} from "@repo/types";
import { randomUUID } from "crypto";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import { createTestOrganizationDataSubmission } from "@test/factories/submissionFactory.js";
import {
  cleanupTestFiles,
  createTestFile,
} from "@test/factories/fileFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";

describe("POST /api/admin/requests/:id/review - Integration Tests", () => {
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

  it("should mark a pending submission as OBJECTED and attach revision files when UUIDs are repeated", async () => {
    const org = await createTestOrganization(prisma);
    const orgData = await createTestOrganizationData(prisma, org.id);
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      orgData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const revisionFile = await createTestFile(prisma, testUser.id);

    const requestBody: ReviewSubmissionBody = {
      reviewComments: "Please address the marked observations.",
      revisionFileUuids: [revisionFile.uuid, revisionFile.uuid],
    };

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/requests/${submission.id}/review`,
      payload: requestBody,
    });

    expect(response.statusCode).toBe(200);
    expect(
      JSON.parse(response.body) as unknown as ReviewSubmissionResponse
    ).toEqual({});

    const updatedSubmission = await prisma.submission.findUnique({
      where: { id: submission.id },
    });
    expect(updatedSubmission).toEqual(
      expect.objectContaining({
        status: SubmissionStatus.OBJECTED,
        reviewerId: testUser.id,
        updatedById: testUser.id,
        reviewComments: requestBody.reviewComments,
      })
    );

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

    const requestBody: ReviewSubmissionBody = {
      reviewComments: "Please address the marked observations.",
      revisionFileUuids: [revisionFile.uuid, missingUuid],
    };

    const response = await app.inject({
      method: "POST",
      url: `/api/admin/requests/${submission.id}/review`,
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
});
