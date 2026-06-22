import { Prisma, SubmissionFileType, type PrismaClient } from "@repo/database";
import { SubmissionHistoryEntry, SubmissionEventType } from "@repo/types";
import type { ReadUrlSigner, StorageAdapter } from "@repo/storage";
import { mapOrganizationSummary } from "../../mappers/mapOrganizationSummary.js";
import type { mapFilesWithUrls } from "../../mappers/mapFilesWithUrls.js";

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

export type SignedFile = Awaited<ReturnType<typeof mapFilesWithUrls>>[number];

/** Splits submission files into attachments, recognitions, and revision attachments. */
export function groupSubmissionHistoryFiles(
  files: SubmissionHistoryFileLink[]
): GroupedSubmissionHistoryFiles {
  return files.reduce<GroupedSubmissionHistoryFiles>(
    (grouped, fileLink) => {
      switch (fileLink.type) {
        case SubmissionFileType.SUBMIT_ATTACHMENT:
          grouped.attachments.push(fileLink.file);
          break;
        case SubmissionFileType.RECOGNITION:
          grouped.recognitions.push(fileLink.file);
          break;
        case SubmissionFileType.REVIEW_ATTACHMENT:
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

/** Prisma select shared by both history services (carbon inventory & organization). */
export const submissionHistorySelect = {
  id: true,
  type: true,
  status: true,
  reviewComments: true,
  createdAt: true,
  reviewedAt: true,
  creator: {
    select: { email: true },
  },
  reviewer: {
    select: { email: true },
  },
  subject: {
    select: {
      carbonInventory: {
        select: {
          carbonInventoryId: true,
          carbonInventory: { select: { year: true } },
        },
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
  organizationData: ReturnType<typeof mapOrganizationSummary> | null;
  orgName: string | null;
};

// ---------------------------------------------------------------------------
// Organization helpers
// ---------------------------------------------------------------------------

/** Loads org summary (name + data) used as shared context for every timeline entry. */
export async function getOrgSummaryDetails(
  prisma: PrismaClient,
  organizationId: bigint
): Promise<OrgSummaryInfo> {
  const orgSummary = await prisma.organizationSummaryView.findUnique({
    where: { organizationId },
    include: {
      organizationData: {
        include: {
          sector: true,
          subsector: true,
          countryOrganizationSize: true,
          mainActivity: true,
          representativeCountryJobPosition: true,
        },
      },
    },
  });

  const hasOrgData = orgSummary?.organizationData;

  return {
    organizationId,
    organizationIdString: organizationId.toString(),
    orgName: orgSummary?.name ?? null,
    organizationData: hasOrgData ? mapOrganizationSummary(orgSummary) : null,
  };
}

/** Returns a presigned read-URL signer when submissions have files; null otherwise. */
export const createHistoryReadUrlSigner = async (
  submissions: SubmissionHistoryRow[],
  storage: StorageAdapter
): Promise<ReadUrlSigner | null> => {
  const hasFiles = submissions.some(
    (submission) => submission.files.length > 0
  );

  if (!hasFiles) {
    return null;
  }

  return storage.createReadUrlSigner();
};

// ---------------------------------------------------------------------------
// Base entry builder
// ---------------------------------------------------------------------------

/** Builds the common fields (IDs, type, status, org metadata) shared by every event of a submission. */
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
  carbonInventoryYear:
    submission.subject.carbonInventory?.carbonInventory.year ?? null,
  organizationId: context.organizationIdString,
  organizationData: context.organizationData,
});

/** Builds the date/userName/comment fields shared by all event builders. */
const eventDateUserComment = (
  date: Date,
  userName: string | null | undefined,
  comment: string
) => ({
  date: date.toISOString(),
  userName: userName ?? null,
  comment,
});

/** SELF_DECLARATION: user self-declared a carbon inventory footprint. Only for carbon inventory histories. */
export const buildSelfDeclarationEvent = (
  carbonInventoryId: string,
  carbonInventoryYear: number | null,
  selfDeclaredAt: Date,
  context: OrgSummaryInfo,
  selfDeclaredBy: { email: string | null } | null
): SubmissionHistoryEntry => ({
  submissionId: null,
  submissionType: null,
  status: null,
  eventType: SubmissionEventType.SELF_DECLARATION,
  date: selfDeclaredAt.toISOString(),
  userName: selfDeclaredBy?.email ?? null,
  userMetadata: context.orgName,
  carbonInventoryId,
  carbonInventoryYear,
  organizationId: context.organizationIdString,
  organizationData: context.organizationData,
  comment: "",
  files: [],
  recognitions: [],
});

/** POSTULATION: user submitted a manual postulation. Carries attachment files. */
export const buildPostulationEvent = (
  baseEntry: ReturnType<typeof buildSubmissionBaseEntry>,
  submission: SubmissionHistoryRow,
  attachments: SignedFile[]
): SubmissionHistoryEntry => ({
  ...baseEntry,
  ...eventDateUserComment(submission.createdAt, submission.creator?.email, ""),
  eventType: SubmissionEventType.POSTULATION,
  files: attachments,
  recognitions: [],
});

/** ON_REVIEW: synthetic marker indicating the submission is under review. Derives from its postulation. */
export const buildOnReviewEvent = (
  postulationEvent: SubmissionHistoryEntry
): SubmissionHistoryEntry => ({
  ...postulationEvent,
  eventType: SubmissionEventType.ON_REVIEW,
  status: null,
  comment: "",
  files: [],
  recognitions: [],
});

/** APPROVED: admin manually approved. Carries recognition files and revision attachments. */
export const buildApprovedEvent = (
  baseEntry: ReturnType<typeof buildSubmissionBaseEntry>,
  submission: SubmissionHistoryRow,
  revisionAttachments: SignedFile[],
  recognitions: SignedFile[]
): SubmissionHistoryEntry => ({
  ...baseEntry,
  ...eventDateUserComment(
    submission.reviewedAt ?? submission.createdAt,
    submission.reviewer?.email,
    submission.reviewComments ?? ""
  ),
  eventType: SubmissionEventType.APPROVED,
  files: revisionAttachments,
  recognitions,
});

/** APPROVED_AUTOMATICALLY: system auto-approved. No files, no reviewer, no creator. */
export const buildApprovedAutomaticallyEvent = (
  baseEntry: ReturnType<typeof buildSubmissionBaseEntry>,
  submission: SubmissionHistoryRow
): SubmissionHistoryEntry => ({
  ...baseEntry,
  ...eventDateUserComment(submission.createdAt, null, ""),
  eventType: SubmissionEventType.APPROVED_AUTOMATICALLY,
  files: [],
  recognitions: [],
});

/** REVIEWED: admin left observations. Carries review comments, revision attachments and recognitions. */
export const buildReviewedEvent = (
  baseEntry: ReturnType<typeof buildSubmissionBaseEntry>,
  submission: SubmissionHistoryRow,
  revisionAttachments: SignedFile[],
  recognitions: SignedFile[]
): SubmissionHistoryEntry => ({
  ...baseEntry,
  ...eventDateUserComment(
    submission.reviewedAt ?? submission.createdAt,
    submission.reviewer?.email,
    submission.reviewComments ?? ""
  ),
  eventType: SubmissionEventType.REVIEWED,
  files: revisionAttachments,
  recognitions,
});

/** REJECTED: admin rejected. Carries review comments and revision attachments, no recognitions. */
export const buildRejectedEvent = (
  baseEntry: ReturnType<typeof buildSubmissionBaseEntry>,
  submission: SubmissionHistoryRow,
  revisionAttachments: SignedFile[]
): SubmissionHistoryEntry => ({
  ...baseEntry,
  ...eventDateUserComment(
    submission.reviewedAt ?? submission.createdAt,
    submission.reviewer?.email,
    submission.reviewComments ?? ""
  ),
  eventType: SubmissionEventType.REJECTED,
  files: revisionAttachments,
  recognitions: [],
});

/**
 * Valid event combinations per submission status.
 * Each variant uses SubmissionEventType as discriminant (`kind`).
 */
export type SubmissionEventGroup =
  | {
      kind: typeof SubmissionEventType.POSTULATION;
      postulationEvent: SubmissionHistoryEntry;
    }
  | {
      kind: typeof SubmissionEventType.APPROVED;
      postulationEvent: SubmissionHistoryEntry;
      onReviewEvent: SubmissionHistoryEntry;
      approvedEvent: SubmissionHistoryEntry;
    }
  | {
      kind: typeof SubmissionEventType.APPROVED_AUTOMATICALLY;
      autoApprovedEvent: SubmissionHistoryEntry;
    }
  | {
      kind: typeof SubmissionEventType.REVIEWED;
      postulationEvent: SubmissionHistoryEntry;
      onReviewEvent: SubmissionHistoryEntry;
      reviewedEvent: SubmissionHistoryEntry;
    }
  | {
      kind: typeof SubmissionEventType.REJECTED;
      postulationEvent: SubmissionHistoryEntry;
      onReviewEvent: SubmissionHistoryEntry;
      rejectedEvent: SubmissionHistoryEntry;
    }
  | {
      kind: typeof SubmissionEventType.SELF_DECLARATION;
      selfDeclarationEvent: SubmissionHistoryEntry;
    };

/**
 * Flattens a SubmissionEventGroup into an ordered array for the timeline.
 * ON_REVIEW is always included for reviewed submissions (APPROVED, REVIEWED, REJECTED).
 */
export const flattenEventGroup = (
  group: SubmissionEventGroup
): SubmissionHistoryEntry[] => {
  switch (group.kind) {
    case SubmissionEventType.SELF_DECLARATION:
      return [group.selfDeclarationEvent];

    case SubmissionEventType.POSTULATION:
      return [group.postulationEvent];

    case SubmissionEventType.APPROVED_AUTOMATICALLY:
      return [group.autoApprovedEvent];

    case SubmissionEventType.APPROVED:
      return [group.postulationEvent, group.onReviewEvent, group.approvedEvent];

    case SubmissionEventType.REVIEWED:
      return [group.postulationEvent, group.onReviewEvent, group.reviewedEvent];

    case SubmissionEventType.REJECTED:
      return [group.postulationEvent, group.onReviewEvent, group.rejectedEvent];
  }
};
