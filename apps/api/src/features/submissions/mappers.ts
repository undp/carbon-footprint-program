import { SubmissionStatus } from "@repo/database";
import { SubmissionHistoryEntry, SubmissionEventType } from "@repo/types";
import { sortBy } from "lodash-es";
import { mapFilesWithUrls } from "../../mappers/mapFilesWithUrls.js";
import type { ReadUrlSigner } from "@repo/storage";
import {
  SignedFile,
  SubmissionHistoryRow,
  SubmissionEventGroup,
  OrgSummaryInfo,
  buildSubmissionBaseEntry,
  groupSubmissionHistoryFiles,
  buildPostulationEvent,
  buildOnReviewEvent,
  buildApprovedEvent,
  buildApprovedAutomaticallyEvent,
  buildReviewedEvent,
  buildRejectedEvent,
  flattenEventGroup,
} from "./helpers.js";

/** Signs blob URLs for a submission's files grouped by type. Returns empty arrays when no signer exists. */
const mapSubmissionFiles = async (
  files: SubmissionHistoryRow["files"],
  signReadUrl: ReadUrlSigner | null
) => {
  const groupedFiles = groupSubmissionHistoryFiles(files);

  if (!signReadUrl) {
    return {
      attachments: [] as SignedFile[],
      recognitions: [] as SignedFile[],
      revisionAttachments: [] as SignedFile[],
    };
  }

  const [attachments, recognitions, revisionAttachments] = await Promise.all([
    mapFilesWithUrls(groupedFiles.attachments, signReadUrl),
    mapFilesWithUrls(groupedFiles.recognitions, signReadUrl),
    mapFilesWithUrls(groupedFiles.revisionAttachments, signReadUrl),
  ]);

  return { attachments, recognitions, revisionAttachments };
};

/**
 * Transforms a single DB submission into a typed SubmissionEventGroup.
 * Signs files, then dispatches to the appropriate event builders based on submission status.
 */
export const mapSubmissionEventGroup = async (
  submission: SubmissionHistoryRow,
  context: OrgSummaryInfo,
  signReadUrl: ReadUrlSigner | null
): Promise<SubmissionEventGroup> => {
  const { attachments, recognitions, revisionAttachments } =
    await mapSubmissionFiles(submission.files, signReadUrl);

  const baseEntry = buildSubmissionBaseEntry(submission, context);

  switch (submission.status) {
    case SubmissionStatus.PENDING:
      return {
        kind: SubmissionEventType.POSTULATION,
        postulationEvent: buildPostulationEvent(
          baseEntry,
          submission,
          attachments
        ),
      };
    case SubmissionStatus.APPROVED: {
      const postulationEvent = buildPostulationEvent(
        baseEntry,
        submission,
        attachments
      );
      return {
        kind: SubmissionEventType.APPROVED,
        postulationEvent,
        onReviewEvent: buildOnReviewEvent(postulationEvent),
        approvedEvent: buildApprovedEvent(
          baseEntry,
          submission,
          revisionAttachments,
          recognitions
        ),
      };
    }
    case SubmissionStatus.APPROVED_AUTOMATICALLY:
      return {
        kind: SubmissionEventType.APPROVED_AUTOMATICALLY,
        autoApprovedEvent: buildApprovedAutomaticallyEvent(
          baseEntry,
          submission
        ),
      };
    case SubmissionStatus.REVIEWED: {
      const postulationEvent = buildPostulationEvent(
        baseEntry,
        submission,
        attachments
      );
      return {
        kind: SubmissionEventType.REVIEWED,
        postulationEvent,
        onReviewEvent: buildOnReviewEvent(postulationEvent),
        reviewedEvent: buildReviewedEvent(
          baseEntry,
          submission,
          revisionAttachments,
          recognitions
        ),
      };
    }
    case SubmissionStatus.REJECTED: {
      const postulationEvent = buildPostulationEvent(
        baseEntry,
        submission,
        attachments
      );
      return {
        kind: SubmissionEventType.REJECTED,
        postulationEvent,
        onReviewEvent: buildOnReviewEvent(postulationEvent),
        rejectedEvent: buildRejectedEvent(
          baseEntry,
          submission,
          revisionAttachments
        ),
      };
    }
  }

  const unhandledStatus: never = submission.status;
  throw new Error(`Unhandled SubmissionStatus: ${String(unhandledStatus)}`);
};

/** Flattens event groups into a sorted timeline (newest first). */
export const mapTimelineResponse = (
  submissionEventGroups: SubmissionEventGroup[]
): SubmissionHistoryEntry[] => {
  if (!submissionEventGroups.length) return [];

  return sortBy(
    submissionEventGroups.flatMap(flattenEventGroup),
    "date"
  ).reverse();
};
