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
import type { FastifyInstance } from "fastify";
import {
  type PrismaClient,
  type User,
  SubmissionFileType,
  SubmissionStatus,
  SubmissionType,
} from "@repo/database";
import {
  SubmissionEventType,
  type GetSubmissionHistoryResponse,
} from "@repo/types";
import type { ApiErrorResponse } from "@/commonSchemas/errors.js";
import { createTestApp } from "@test/factories/appFactory.js";
import {
  cleanupCarbonInventoryTestData,
  carbonInventoryPatterns,
  createInventoryFromPattern,
} from "@test/factories/carbonInventorySeeder.js";
import {
  cleanupTestFiles,
  createTestFileForSubmission,
} from "@test/factories/fileFactory.js";
import { createTestMembership } from "@test/factories/membershipFactory.js";
import { createTestOrganizationData } from "@test/factories/organizationDataFactory.js";
import {
  cleanupTestOrganization,
  createTestOrganization,
} from "@test/factories/organizationFactory.js";
import {
  cleanupTestSubmissions,
  createTestOrganizationDataSubmission,
  createTestSubmission,
  createTestSubmissionSubjectForCarbonInventory,
} from "@test/factories/submissionFactory.js";
import { getTestLoggedUser } from "@test/factories/userFactory.js";

const { mockCreateReadSasUrlSigner, mockSignReadSasUrl } = vi.hoisted(() => ({
  mockCreateReadSasUrlSigner: vi.fn(),
  mockSignReadSasUrl: vi.fn(),
}));

vi.mock("@/services/blobService.js", async () => {
  const actual = await vi.importActual<
    typeof import("@/services/blobService.js")
  >("@/services/blobService.js");

  return {
    ...actual,
    createReadSasUrlSigner: mockCreateReadSasUrlSigner.mockResolvedValue(
      mockSignReadSasUrl.mockImplementation((blobPath: string) =>
        Promise.resolve({
          url: `https://mock.blob.core.windows.net/test/${blobPath}?sig=mock`,
          expiresAt: new Date("2099-12-31T23:59:59.000Z"),
        })
      )
    ),
  };
});

describe("GET /api/submissions/history - Integration Tests", () => {
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
    vi.clearAllMocks();
    await cleanupTestFiles(prisma);
    await cleanupTestSubmissions(prisma);
    await cleanupCarbonInventoryTestData(prisma);
    await cleanupTestOrganization(prisma);
  });

  async function createMemberOrganization() {
    const organization = await createTestOrganization(prisma);
    await createTestMembership(prisma, testUser.id, organization.id);
    return organization;
  }

  async function getHistory(
    query: URLSearchParams
  ): Promise<GetSubmissionHistoryResponse> {
    const response = await requestHistory(query);

    expect(response.statusCode).toBe(200);
    return JSON.parse(response.body) as GetSubmissionHistoryResponse;
  }

  async function requestHistory(query: URLSearchParams) {
    return app.inject({
      method: "GET",
      url: `/api/submissions/history?${query.toString()}`,
    });
  }

  async function withStorageDisabled<T>(run: () => Promise<T>): Promise<T> {
    const originalBlobServiceClient = app.blobServiceClient;
    const originalContainerName = app.storageContainerName;

    app.blobServiceClient = undefined;
    app.storageContainerName = undefined;

    try {
      return await run();
    } finally {
      app.blobServiceClient = originalBlobServiceClient;
      app.storageContainerName = originalContainerName;
    }
  }

  it("returns a single POSTULATION event dated with createdAt for pending submissions", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );
    const createdAt = new Date("2026-01-15T10:00:00.000Z");

    await prisma.submission.update({
      where: { id: submission.id },
      data: { createdAt },
    });

    const history = await getHistory(
      new URLSearchParams({ organizationId: organization.id.toString() })
    );

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      submissionType: SubmissionType.ORGANIZATION_ACCREDITATION,
      eventType: SubmissionEventType.POSTULATION,
      date: createdAt.toISOString(),
    });
  });

  it.each([
    [SubmissionStatus.APPROVED, SubmissionEventType.APPROVED],
    [SubmissionStatus.REJECTED, SubmissionEventType.REJECTED],
    [SubmissionStatus.OBJECTED, SubmissionEventType.OBJECTED],
  ])(
    "returns POSTULATION plus %s dated with reviewedAt",
    async (status, eventType) => {
      const organization = await createMemberOrganization();
      const organizationData = await createTestOrganizationData(
        prisma,
        organization.id
      );
      const { submission } = await createTestOrganizationDataSubmission(
        prisma,
        organizationData.id,
        status,
        testUser.id,
        testUser.id,
        "Reviewed by admin"
      );
      const createdAt = new Date("2026-01-10T09:00:00.000Z");
      const reviewedAt = new Date("2026-01-12T14:30:00.000Z");

      await prisma.submission.update({
        where: { id: submission.id },
        data: { createdAt, reviewedAt },
      });

      const history = await getHistory(
        new URLSearchParams({ organizationId: organization.id.toString() })
      );

      expect(history.map((entry) => entry.eventType)).toEqual([
        eventType,
        SubmissionEventType.POSTULATION,
      ]);
      expect(history[0]).toMatchObject({
        submissionId: submission.id.toString(),
        eventType,
        date: reviewedAt.toISOString(),
        comment: "Reviewed by admin",
      });
      expect(history[1]).toMatchObject({
        submissionId: submission.id.toString(),
        eventType: SubmissionEventType.POSTULATION,
        date: createdAt.toISOString(),
        comment: "",
      });
    }
  );

  it("shows revision attachments only on the OBJECTED reviewed event", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.OBJECTED,
      testUser.id,
      testUser.id,
      "Please fix these items"
    );
    const createdAt = new Date("2026-01-10T09:00:00.000Z");
    const reviewedAt = new Date("2026-01-12T14:30:00.000Z");

    await prisma.submission.update({
      where: { id: submission.id },
      data: { createdAt, reviewedAt },
    });

    const { file: attachmentFile } = await createTestFileForSubmission(
      prisma,
      testUser.id,
      submission.id,
      {
        type: SubmissionFileType.ATTACHMENT,
        fileOverrides: { originalName: "original-attachment.pdf" },
      }
    );
    const { file: revisionFile } = await createTestFileForSubmission(
      prisma,
      testUser.id,
      submission.id,
      {
        type: SubmissionFileType.REVISION_ATTACHMENT,
        fileOverrides: { originalName: "revision-note.pdf" },
      }
    );

    const history = await getHistory(
      new URLSearchParams({ organizationId: organization.id.toString() })
    );

    expect(history.map((entry) => entry.eventType)).toEqual([
      SubmissionEventType.OBJECTED,
      SubmissionEventType.POSTULATION,
    ]);
    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.OBJECTED,
      date: reviewedAt.toISOString(),
      comment: "Please fix these items",
      recognitions: [],
    });
    expect(history[0].files).toHaveLength(1);
    expect(history[0].files[0]?.uuid).toBe(revisionFile.uuid);
    expect(history[0].files[0]?.originalName).toBe("revision-note.pdf");

    expect(history[1]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.POSTULATION,
      date: createdAt.toISOString(),
      comment: "",
      recognitions: [],
    });
    expect(history[1].files).toHaveLength(1);
    expect(history[1].files[0]?.uuid).toBe(attachmentFile.uuid);
    expect(history[1].files[0]?.originalName).toBe("original-attachment.pdf");
  });

  it("does not expose revision attachments on non-objected reviewed events", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.APPROVED,
      testUser.id,
      testUser.id,
      "Approved with notes"
    );

    await createTestFileForSubmission(prisma, testUser.id, submission.id, {
      type: SubmissionFileType.REVISION_ATTACHMENT,
      fileOverrides: { originalName: "internal-note.pdf" },
    });

    const history = await getHistory(
      new URLSearchParams({ organizationId: organization.id.toString() })
    );

    expect(history[0]).toMatchObject({
      submissionId: submission.id.toString(),
      eventType: SubmissionEventType.APPROVED,
    });
    expect(history[0].files).toEqual([]);
  });

  it("keeps carbon-inventory history type-agnostic and uses reviewedAt for auto-approved events", async () => {
    const organization = await createMemberOrganization();
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      {
        organizationId: organization.id,
        year: 2024,
        selfDeclaredAt: new Date("2026-01-01T08:00:00.000Z"),
        isSelfDeclared: true,
      }
    );
    const subject = await createTestSubmissionSubjectForCarbonInventory(
      prisma,
      inventory.id
    );
    const automaticSubmission = await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_CALCULATION,
      {
        status: SubmissionStatus.APPROVED_AUTOMATICALLY,
        createdById: testUser.id,
        reviewerId: testUser.id,
        createdAt: new Date("2026-01-02T08:00:00.000Z"),
        reviewedAt: new Date("2026-01-03T08:00:00.000Z"),
      }
    );
    const verificationSubmission = await createTestSubmission(
      prisma,
      subject.id,
      SubmissionType.CARBON_INVENTORY_VERIFICATION,
      {
        status: SubmissionStatus.APPROVED,
        createdById: testUser.id,
        reviewerId: testUser.id,
        createdAt: new Date("2026-01-04T08:00:00.000Z"),
        reviewedAt: new Date("2026-01-05T08:00:00.000Z"),
      }
    );

    const history = await getHistory(
      new URLSearchParams({ carbonInventoryId: inventory.id.toString() })
    );

    expect(history.map((entry) => entry.eventType)).toEqual([
      SubmissionEventType.APPROVED,
      SubmissionEventType.POSTULATION,
      SubmissionEventType.APPROVED_AUTOMATICALLY,
      SubmissionEventType.ON_REVIEW,
      SubmissionEventType.POSTULATION,
      SubmissionEventType.SELF_DECLARATION,
    ]);
    expect(history[0]).toMatchObject({
      submissionId: verificationSubmission.id.toString(),
      submissionType: SubmissionType.CARBON_INVENTORY_VERIFICATION,
      date: "2026-01-05T08:00:00.000Z",
    });
    expect(history[2]).toMatchObject({
      submissionId: automaticSubmission.id.toString(),
      submissionType: SubmissionType.CARBON_INVENTORY_CALCULATION,
      eventType: SubmissionEventType.APPROVED_AUTOMATICALLY,
      date: "2026-01-03T08:00:00.000Z",
    });
    expect(history[3]).toMatchObject({
      submissionId: automaticSubmission.id.toString(),
      submissionType: SubmissionType.CARBON_INVENTORY_CALCULATION,
      eventType: SubmissionEventType.ON_REVIEW,
      date: "2026-01-02T08:00:00.000Z",
    });
  });

  it("returns SELF_DECLARATION even when the inventory has no submission subject yet", async () => {
    const organization = await createMemberOrganization();
    const selfDeclaredAt = new Date("2026-02-01T12:00:00.000Z");
    const inventory = await createInventoryFromPattern(
      prisma,
      carbonInventoryPatterns.simplifiedDraft,
      {
        organizationId: organization.id,
        year: 2024,
        selfDeclaredAt,
        isSelfDeclared: true,
      }
    );

    const history = await getHistory(
      new URLSearchParams({ carbonInventoryId: inventory.id.toString() })
    );

    expect(history).toEqual([
      expect.objectContaining({
        submissionId: null,
        submissionType: null,
        status: null,
        eventType: SubmissionEventType.SELF_DECLARATION,
        date: selfDeclaredAt.toISOString(),
        carbonInventoryId: inventory.id.toString(),
      }),
    ]);
  });

  it("returns 403 when the user is not a member of the organization", async () => {
    const organization = await createTestOrganization(prisma);

    const response = await requestHistory(
      new URLSearchParams({ organizationId: organization.id.toString() })
    );

    expect(response.statusCode).toBe(403);
    expect(JSON.parse(response.body) as ApiErrorResponse).toMatchObject({
      code: "SUBMISSION_FORBIDDEN",
    });
  });

  it("returns 503 when there are attached files but storage is not configured", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission } = await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    await createTestFileForSubmission(prisma, testUser.id, submission.id, {
      type: SubmissionFileType.ATTACHMENT,
    });

    const response = await withStorageDisabled(() =>
      requestHistory(
        new URLSearchParams({ organizationId: organization.id.toString() })
      )
    );

    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body) as ApiErrorResponse).toMatchObject({
      code: "STORAGE_NOT_CONFIGURED",
    });
  });

  it("still returns 200 without storage when the history has no files", async () => {
    const organization = await createMemberOrganization();
    const organizationData = await createTestOrganizationData(
      prisma,
      organization.id
    );

    await createTestOrganizationDataSubmission(
      prisma,
      organizationData.id,
      SubmissionStatus.PENDING,
      testUser.id
    );

    const response = await withStorageDisabled(() =>
      requestHistory(
        new URLSearchParams({ organizationId: organization.id.toString() })
      )
    );

    expect(response.statusCode).toBe(200);
    expect(mockCreateReadSasUrlSigner).not.toHaveBeenCalled();
  });

  it("orders the timeline by event date instead of submission createdAt only", async () => {
    const organization = await createMemberOrganization();
    const firstOrgData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const secondOrgData = await createTestOrganizationData(
      prisma,
      organization.id
    );
    const { submission: approvedSubmission } =
      await createTestOrganizationDataSubmission(
        prisma,
        firstOrgData.id,
        SubmissionStatus.APPROVED,
        testUser.id,
        testUser.id
      );
    const { submission: pendingSubmission } =
      await createTestOrganizationDataSubmission(
        prisma,
        secondOrgData.id,
        SubmissionStatus.PENDING,
        testUser.id
      );

    await prisma.submission.update({
      where: { id: approvedSubmission.id },
      data: {
        createdAt: new Date("2026-01-01T10:00:00.000Z"),
        reviewedAt: new Date("2026-01-10T10:00:00.000Z"),
      },
    });
    await prisma.submission.update({
      where: { id: pendingSubmission.id },
      data: {
        createdAt: new Date("2026-01-05T10:00:00.000Z"),
      },
    });

    const history = await getHistory(
      new URLSearchParams({ organizationId: organization.id.toString() })
    );

    expect(history[0]).toMatchObject({
      submissionId: approvedSubmission.id.toString(),
      eventType: SubmissionEventType.APPROVED,
      date: "2026-01-10T10:00:00.000Z",
    });
    expect(history[1]).toMatchObject({
      submissionId: pendingSubmission.id.toString(),
      eventType: SubmissionEventType.POSTULATION,
      date: "2026-01-05T10:00:00.000Z",
    });
  });
});
