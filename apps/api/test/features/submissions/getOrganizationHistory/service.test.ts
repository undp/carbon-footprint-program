import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import type { BlobServiceClient } from "@azure/storage-blob";
import {
  SubmissionStatus,
  SubmissionType,
  SubmissionFileType,
  type PrismaClient,
} from "@repo/database";
import { createReadSasUrlSigner } from "@/services/blobService.js";
import { getOrganizationHistoryService } from "@/features/submissions/getOrganizationHistory/service.js";

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
    createReadSasUrlSigner: mockCreateReadSasUrlSigner,
  };
});

describe("getOrganizationHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReadSasUrlSigner.mockResolvedValue(mockSignReadSasUrl);
    mockSignReadSasUrl.mockImplementation((blobPath: string) =>
      Promise.resolve({
        url: `https://mock.blob.core.windows.net/test/${blobPath}?sig=mock`,
        expiresAt: new Date("2099-12-31T23:59:59.000Z"),
      })
    );
  });

  it("creates one request-scoped signer for all file groups in the history response", async () => {
    const prisma = {
      organizationSummaryView: {
        findUnique: vi.fn().mockResolvedValue({
          organizationId: 1n,
          name: "Example S.A.",
          lastSubmissionStatus: SubmissionStatus.REVIEWED,
          hasUnsubmittedChanges: false,
        }),
      },
      submission: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 10n,
            type: SubmissionType.CARBON_INVENTORY_VERIFICATION,
            status: SubmissionStatus.REVIEWED,
            reviewComments: "Please update the files",
            createdAt: new Date("2026-01-10T09:00:00.000Z"),
            reviewedAt: new Date("2026-01-12T14:30:00.000Z"),
            creator: { email: "maria.gonzalez@example.com" },
            reviewer: { email: "jorge.rodriguez@example.com" },
            subject: {
              carbonInventory: {
                carbonInventoryId: 20n,
                carbonInventory: { year: 2026 },
              },
            },
            files: [
              {
                type: SubmissionFileType.SUBMIT_ATTACHMENT,
                file: {
                  uuid: "attachment-uuid",
                  originalName: "attachment.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 1024,
                  blobPath: "attachments/attachment.pdf",
                  createdAt: new Date("2026-01-10T09:00:00.000Z"),
                },
              },
              {
                type: SubmissionFileType.RECOGNITION,
                file: {
                  uuid: "recognition-uuid",
                  originalName: "recognition.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 2048,
                  blobPath: "recognitions/recognition.pdf",
                  createdAt: new Date("2026-01-12T14:30:00.000Z"),
                },
              },
              {
                type: SubmissionFileType.REVIEW_ATTACHMENT,
                file: {
                  uuid: "revision-uuid",
                  originalName: "revision.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 512,
                  blobPath: "revisions/revision.pdf",
                  createdAt: new Date("2026-01-12T14:30:00.000Z"),
                },
              },
            ],
          },
        ]),
      },
    } as unknown as PrismaClient;

    const history = await getOrganizationHistoryService(
      prisma,
      {} as BlobServiceClient,
      "test-container",
      "1"
    );

    expect(history).toHaveLength(3);
    expect(history[0]?.eventType).toBe("REVIEWED");
    expect(history[1]?.eventType).toBe("ON_REVIEW");
    expect(history[2]?.eventType).toBe("POSTULATION");
    expect(
      createReadSasUrlSigner as MockedFunction<typeof createReadSasUrlSigner>
    ).toHaveBeenCalledTimes(1);
    expect(mockSignReadSasUrl).toHaveBeenCalledTimes(3);
  });
});
