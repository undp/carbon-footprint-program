import {
  SubmissionHistoryEntry,
  SubmissionEventType,
  SubmissionStatus,
} from "@repo/types";
import { sortBy } from "lodash-es";
import { mapFilesWithUrls } from "../../mappers/mapFilesWithUrls.js";
import { ReadSasUrlSigner } from "../../services/blobService.js";
import {
  SubmissionHistoryRow,
  OrgSummaryInfo,
  buildSubmissionBaseEntry,
  groupSubmissionHistoryFiles,
  deriveEventType,
} from "./helpers.js";

type SubmissionEventGroup = {
  postulationEvent: SubmissionHistoryEntry;
  reviewedEvent: SubmissionHistoryEntry | null;
};

/**
 * Groups a submission's files by type and signs their blob URLs in parallel.
 * Returns empty arrays when no signer is available (i.e. no files exist in
 * the entire history request).
 */
const mapSubmissionFiles = async (
  files: SubmissionHistoryRow["files"],
  signReadSasUrl: ReadSasUrlSigner | null
) => {
  const groupedFiles = groupSubmissionHistoryFiles(files);

  if (!signReadSasUrl) {
    return {
      attachments: [],
      recognitions: [],
      revisionAttachments: [],
    };
  }

  const [attachments, recognitions, revisionAttachments] = await Promise.all([
    mapFilesWithUrls(groupedFiles.attachments, signReadSasUrl),
    mapFilesWithUrls(groupedFiles.recognitions, signReadSasUrl),
    mapFilesWithUrls(groupedFiles.revisionAttachments, signReadSasUrl),
  ]);

  return { attachments, recognitions, revisionAttachments };
};

/**
 * Transforms a single submission into an object with a pair of timeline events:
 *
 * 1. **POSTULATION** — always created, dated at `createdAt`, with the
 *    creator's name and the submission's attachment files.
 * 2. **Reviewed event** (APPROVED | REJECTED | REVIEWED | APPROVED_AUTOMATICALLY)
 *    — created only when the submission has been reviewed (status !== PENDING).
 *    Dated at `reviewedAt`, carries the reviewer's name, review comments,
 *    and either revision attachments (for REVIEWED) or recognition files.
 *
 * Returns `reviewedEvent: null` when the submission is still pending.
 */
export const mapSubmissionEventGroup = async (
  submission: SubmissionHistoryRow,
  context: OrgSummaryInfo,
  signReadSasUrl: ReadSasUrlSigner | null
): Promise<SubmissionEventGroup> => {
  const { attachments, recognitions, revisionAttachments } =
    await mapSubmissionFiles(submission.files, signReadSasUrl);

  const baseEntry = buildSubmissionBaseEntry(submission, context);
  const reviewedEventType = deriveEventType(submission.status);
  const postulationEventType =
    submission.status === SubmissionStatus.APPROVED_AUTOMATICALLY
      ? SubmissionEventType.AUTOMATIC_POSTULATION
      : SubmissionEventType.POSTULATION;
  const postulationEvent: SubmissionHistoryEntry = {
    ...baseEntry,
    eventType: postulationEventType,
    date: submission.createdAt.toISOString(),
    userName: submission.creator?.email ?? null,
    comment: "",
    files: attachments,
    recognitions: [],
  };

  if (reviewedEventType === SubmissionEventType.POSTULATION) {
    return { postulationEvent, reviewedEvent: null };
  }

  return {
    postulationEvent,
    reviewedEvent: {
      ...baseEntry,
      eventType: reviewedEventType,
      userName: submission.reviewer?.email ?? null,
      date: (submission.reviewedAt ?? submission.createdAt).toISOString(),
      comment: submission.reviewComments ?? "",
      files:
        reviewedEventType === SubmissionEventType.REVIEWED
          ? revisionAttachments
          : [],
      recognitions,
    },
  };
};

/**
 * Assembles the final sorted timeline from submission event groups.
 *
 * For each reviewed submission (index > 0) an ON_REVIEW marker is inserted
 * between the POSTULATION and the reviewed event. This marks the period
 * where the submission was under review in multi-submission timelines.
 *
 * If a self-declaration event is provided (carbon inventory histories only),
 * it is appended at the end before sorting.
 *
 * The resulting array is sorted by date descending (newest first).
 */
export const mapTimelineResponse = (
  submissionEventGroups: SubmissionEventGroup[],
  selfDeclarationEvent: SubmissionHistoryEntry | null
): SubmissionHistoryEntry[] => {
  if (!submissionEventGroups.length) {
    return selfDeclarationEvent ? [selfDeclarationEvent] : [];
  }

  const response = submissionEventGroups.flatMap<SubmissionHistoryEntry>(
    ({ postulationEvent, reviewedEvent }, submissionIndex) => {
      if (!reviewedEvent) {
        return [postulationEvent];
      }

      const timelineEvents: SubmissionHistoryEntry[] = [postulationEvent];

      if (submissionIndex > 0) {
        timelineEvents.push({
          ...postulationEvent,
          eventType: SubmissionEventType.ON_REVIEW,
          status: null,
          comment: "",
          files: [],
          recognitions: [],
        });
      }

      timelineEvents.push(reviewedEvent);
      return timelineEvents;
    }
  );

  if (selfDeclarationEvent) {
    response.push(selfDeclarationEvent);
  }

  return sortBy(response, "date").reverse();
};
