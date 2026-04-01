import {
  Prisma,
  SubmissionFileType,
  SubmissionStatus,
  type PrismaClient,
} from "@repo/database";
import { BlobServiceClient } from "@azure/storage-blob";
import { SubmissionHistoryEntry, SubmissionEventType } from "@repo/types";
import {
  ReadSasUrlSigner,
  createReadSasUrlSigner,
} from "../../services/blobService.js";
import { StorageNotConfiguredError } from "../files/errors.js";
import { mapOrgSummaryToCommonFields } from "./mappers.js";

export type SubmissionHistoryFileRow = {
  uuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  blobPath: string;
  createdAt: Date;
};

export type GroupedSubmissionHistoryFiles = {
  attachments: SubmissionHistoryFileRow[];
  recognitions: SubmissionHistoryFileRow[];
  revisionAttachments: SubmissionHistoryFileRow[];
};

export type SubmissionHistoryFileLink = {
  type: SubmissionFileType;
  file: SubmissionHistoryFileRow;
};

/**
 * Maps a raw {@link SubmissionStatus} to its corresponding timeline
 * {@link SubmissionEventType}. PENDING submissions become POSTULATION events;
 * all other statuses map 1-to-1. Falls back to POSTULATION for unknown values.
 */
export function deriveEventType(status: SubmissionStatus): SubmissionEventType {
  switch (status) {
    case SubmissionStatus.PENDING:
      return SubmissionEventType.POSTULATION;
    case SubmissionStatus.APPROVED_AUTOMATICALLY:
      return SubmissionEventType.APPROVED_AUTOMATICALLY;
    case SubmissionStatus.APPROVED:
      return SubmissionEventType.APPROVED;
    case SubmissionStatus.REJECTED:
      return SubmissionEventType.REJECTED;
    case SubmissionStatus.OBJECTED:
      return SubmissionEventType.OBJECTED;
    default:
      return SubmissionEventType.POSTULATION;
  }
}

/**
 * Categorizes a flat list of submission file links into three buckets:
 * attachments, recognitions, and revision attachments.
 * Called once per submission so the timeline mapper can reference each
 * bucket independently when building POSTULATION and reviewed events.
 */
export function groupSubmissionHistoryFiles(
  files: SubmissionHistoryFileLink[]
): GroupedSubmissionHistoryFiles {
  return files.reduce<GroupedSubmissionHistoryFiles>(
    (grouped, fileLink) => {
      switch (fileLink.type) {
        case SubmissionFileType.ATTACHMENT:
          grouped.attachments.push(fileLink.file);
          break;
        case SubmissionFileType.RECOGNITION:
          grouped.recognitions.push(fileLink.file);
          break;
        case SubmissionFileType.REVISION_ATTACHMENT:
          grouped.revisionAttachments.push(fileLink.file);
          break;
      }

      return grouped;
    },
    {
      attachments: [],
      recognitions: [],
      revisionAttachments: [],
    }
  );
}

/**
 * Prisma select clause shared by both history services.
 * Fetches the submission metadata, creator/reviewer names,
 * the linked carbon inventory ID, and all associated files.
 */
export const submissionHistorySelect = {
  id: true,
  type: true,
  status: true,
  reviewComments: true,
  createdAt: true,
  reviewedAt: true,
  creator: {
    select: { firstName: true, lastName: true },
  },
  reviewer: {
    select: { firstName: true, lastName: true },
  },
  subject: {
    select: {
      carbonInventory: {
        select: { carbonInventoryId: true },
      },
    },
  },
  files: {
    select: {
      type: true,
      file: {
        select: {
          uuid: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          blobPath: true,
          createdAt: true,
        },
      },
    },
    orderBy: { file: { createdAt: "desc" } },
  },
} satisfies Prisma.SubmissionSelect;

export type SubmissionHistoryRow = Prisma.SubmissionGetPayload<{
  select: typeof submissionHistorySelect;
}>;

export type OrgSummaryInfo = {
  organizationId: bigint;
  organizationIdString: string;
  organizationData: ReturnType<typeof mapOrgSummaryToCommonFields> | null;
  orgName: string | null;
};

/**
 * Loads the organization summary view and returns the context object
 * (name, last submission status, pending-changes flag) that every
 * timeline entry shares. Returns nulls when the org has no summary row.
 */
export async function getOrgSummaryDetails(
  prisma: PrismaClient,
  organizationId: bigint
): Promise<OrgSummaryInfo> {
  const orgSummary = await prisma.organizationSummaryView.findUnique({
    where: { organizationId },
  });

  return {
    organizationId,
    organizationIdString: organizationId.toString(),
    orgName: orgSummary?.name ?? null,
    organizationData: orgSummary
      ? mapOrgSummaryToCommonFields(orgSummary)
      : null,
  };
}

/**
 * Creates a single Azure Blob Storage SAS signer for the entire request,
 * but only when at least one submission carries files. Returns null when
 * no files exist, and throws {@link StorageNotConfiguredError} if files
 * are present but blob storage is not configured.
 */
export const createHistoryReadSasSigner = async (
  submissions: SubmissionHistoryRow[],
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null
): Promise<ReadSasUrlSigner | null> => {
  const hasFiles = submissions.some(
    (submission) => submission.files.length > 0
  );

  if (!hasFiles) {
    return null;
  }

  if (!blobServiceClient || !containerName) {
    throw new StorageNotConfiguredError();
  }

  return createReadSasUrlSigner(blobServiceClient, containerName);
};

/**
 * Builds the common fields shared by every timeline entry for a given
 * submission: IDs, type, status, organization metadata, and the linked
 * carbon inventory ID (if any).
 */
export const buildSubmissionBaseEntry = (
  submission: SubmissionHistoryRow,
  context: OrgSummaryInfo
) => ({
  submissionId: submission.id.toString(),
  submissionType: submission.type,
  status: submission.status,
  userMetadata: context.orgName,
  carbonInventoryId:
    submission.subject.carbonInventory?.carbonInventoryId.toString() ?? null,
  organizationId: context.organizationIdString,
  organizationData: context.organizationData,
});

/**
 * Creates the SELF_DECLARATION timeline entry shown at the bottom of a
 * carbon inventory history when the inventory has been self-declared.
 * Only called by the carbon inventory history service when selfDeclaredAt
 * is present.
 */
export const buildSelfDeclarationEvent = (
  carbonInventoryId: string,
  selfDeclaredAt: Date,
  context: OrgSummaryInfo
): SubmissionHistoryEntry => ({
  submissionId: null,
  submissionType: null,
  status: null,
  eventType: SubmissionEventType.SELF_DECLARATION,
  date: selfDeclaredAt.toISOString(),
  userName: null,
  userMetadata: null,
  carbonInventoryId,
  organizationId: context.organizationIdString,
  organizationData: context.organizationData,
  comment: "",
  files: [],
  recognitions: [],
});
