import { SubmissionHistoryEntry } from "@repo/types";
import { SubmissionEventType } from "@repo/types";
import { buildUserName } from "@repo/utils";
import { sortBy } from "lodash-es";
import { mapFilesWithUrls } from "../../helpers/mapFilesWithUrls.js";
import { ReadSasUrlSigner } from "../../services/blobService.js";
import {
  SubmissionHistoryRow,
  HistoryContext,
  buildSubmissionBaseEntry,
  groupSubmissionHistoryFiles,
  deriveEventType,
} from "./helpers.js";

type SubmissionEventGroup = {
  postulationEvent: SubmissionHistoryEntry;
  reviewedEvent: SubmissionHistoryEntry | null;
};

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

async function mapSubmissionFiles(
  files: SubmissionHistoryRow["files"],
  signReadSasUrl: ReadSasUrlSigner | null
) {
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
}

/**
 * Maps one submission into the timeline card pair shown in the modal.
 */
export async function mapSubmissionEventGroup(
  submission: SubmissionHistoryRow,
  context: HistoryContext,
  signReadSasUrl: ReadSasUrlSigner | null
): Promise<SubmissionEventGroup> {
  const { attachments, recognitions, revisionAttachments } =
    await mapSubmissionFiles(submission.files, signReadSasUrl);

  const baseEntry = buildSubmissionBaseEntry(submission, context);
  const reviewedEventType = deriveEventType(submission.status);
  const postulationEvent: SubmissionHistoryEntry = {
    ...baseEntry,
    eventType: SubmissionEventType.POSTULATION,
    date: submission.createdAt.toISOString(),
    userName: buildUserName(
      submission.creator?.firstName ?? null,
      submission.creator?.lastName ?? null
    ),
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
      userName: buildUserName(
        submission.reviewer?.firstName ?? null,
        submission.reviewer?.lastName ?? null
      ),
      date: (submission.reviewedAt ?? submission.createdAt).toISOString(),
      comment: submission.reviewComments ?? "",
      files:
        reviewedEventType === SubmissionEventType.OBJECTED
          ? revisionAttachments
          : [],
      recognitions,
    },
  };
}

export const buildTimelineResponse = (
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
