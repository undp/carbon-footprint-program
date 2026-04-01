import type { BlobServiceClient } from "@azure/storage-blob";
import type { SubmissionStatus as SubmissionStatusType } from "@repo/database";
import { SubmissionFileType, SubmissionStatus } from "@repo/database";
import type { SubmissionHistoryEntry } from "@repo/types";
import { SubmissionEventType } from "@repo/types";
import { mapFilesWithUrls } from "@/helpers/mapFilesWithUrls.js";

/**
 * Derives a user-facing event type from the raw submission status.
 */
export function deriveEventType(
  status: SubmissionStatusType
): SubmissionEventType {
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
 * Filters submission files by type and maps them to response shape with signed URLs.
 */
export async function mapFilesByType(
  files: Array<{
    type: SubmissionFileType;
    file: {
      uuid: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      blobPath: string;
      createdAt: Date;
    };
  }>,
  fileType: SubmissionFileType,
  blobServiceClient: BlobServiceClient,
  containerName: string
): Promise<SubmissionHistoryEntry["files"]> {
  const rows = files.filter((f) => f.type === fileType).map((f) => f.file);
  return rows.length > 0
    ? mapFilesWithUrls(rows, blobServiceClient, containerName)
    : [];
}

type OrgSummaryRow = {
  organizationId: bigint;
  name: string;
  lastSubmissionStatus: SubmissionHistoryEntry["status"];
  hasUnsubmittedChanges: boolean;
};

/**
 * Maps an organization summary view row to the CommonOrganizationFields response shape.
 */
export function mapOrgSummaryToCommonFields(orgSummary: OrgSummaryRow) {
  return {
    id: orgSummary.organizationId.toString(),
    name: orgSummary.name,
    lastSubmissionStatus: orgSummary.lastSubmissionStatus,
    hasUnsubmittedChanges: orgSummary.hasUnsubmittedChanges,
  };
}
