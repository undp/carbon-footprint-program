import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { MembershipStatus, SubmissionFileType } from "@repo/database";
import { sortBy } from "lodash-es";
import { StorageNotConfiguredError } from "@/features/files/errors.js";
import { SubmissionForbiddenError } from "@/features/submissions/errors.js";
import {
  SubmissionEventType,
  type GetSubmissionHistoryQuery,
  type SubmissionHistoryEntry,
} from "@repo/types";
import { buildUserName } from "@repo/utils";
import {
  deriveEventType,
  mapFilesByType,
  mapOrgSummaryToCommonFields,
} from "../mappers.js";

async function verifyUserOrgMembership(
  prisma: PrismaClient,
  userId: bigint,
  organizationId: bigint
) {
  const membership = await prisma.userOrganizationMembership.findFirst({
    where: {
      userId,
      organizationId,
      status: MembershipStatus.ACTIVE,
    },
  });
  if (!membership)
    throw new SubmissionForbiddenError(organizationId.toString());
}

export const getSubmissionHistoryService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null,
  query: GetSubmissionHistoryQuery,
  user: { id: bigint; isSystemAdmin: boolean }
) => {
  let subjectIds: bigint[];
  let organizationId: bigint | null;
  let selfDeclaredAt: Date | null = null;

  if (query.carbonInventoryId) {
    const carbonInventory = await prisma.carbonInventory.findUnique({
      where: { id: BigInt(query.carbonInventoryId) },
      select: {
        organizationId: true,
        selfDeclaredAt: true,
        submission: {
          select: { subjectId: true },
        },
      },
    });

    if (!carbonInventory) return [];

    organizationId = carbonInventory.organizationId;
    if (!organizationId) return [];

    if (!user.isSystemAdmin) {
      await verifyUserOrgMembership(prisma, user.id, organizationId);
    }

    subjectIds = carbonInventory.submission
      ? [carbonInventory.submission.subjectId]
      : [];
    selfDeclaredAt = carbonInventory.selfDeclaredAt ?? null;
  } else {
    organizationId = BigInt(query.organizationId!);

    if (!user.isSystemAdmin) {
      await verifyUserOrgMembership(prisma, user.id, organizationId);
    }

    const orgSubjects = await prisma.submissionSubjectOrganizationData.findMany(
      {
        where: {
          organizationData: { organizationId },
        },
        select: { subjectId: true },
      }
    );

    if (orgSubjects.length === 0) return [];
    subjectIds = orgSubjects.map((s) => s.subjectId);
  }

  if (!organizationId) return [];

  const orgSummary = await prisma.organizationSummaryView.findUnique({
    where: { organizationId },
  });
  const orgName = orgSummary?.name ?? null;
  const organizationData = orgSummary
    ? mapOrgSummaryToCommonFields(orgSummary)
    : null;

  const submissions = await prisma.submission.findMany({
    where: { subjectId: { in: subjectIds } },
    select: {
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
    },
    orderBy: { createdAt: "desc" },
  });

  const allFiles = submissions.flatMap((s) => s.files);
  const hasFiles = allFiles.length > 0;

  if (hasFiles && (!blobServiceClient || !containerName)) {
    throw new StorageNotConfiguredError();
  }

  const selfDeclarationEvent: SubmissionHistoryEntry | null =
    selfDeclaredAt && query.carbonInventoryId
      ? {
          submissionId: null,
          submissionType: null,
          status: null,
          eventType: SubmissionEventType.SELF_DECLARATION,
          date: selfDeclaredAt.toISOString(),
          userName: null,
          userMetadata: null,
          carbonInventoryId: query.carbonInventoryId,
          organizationId: organizationId.toString(),
          organizationData,
          comment: "",
          files: [],
          recognitions: [],
        }
      : null;

  const submissionEventGroups: Array<{
    postulationEvent: SubmissionHistoryEntry;
    reviewedEvent: SubmissionHistoryEntry | null;
  }> = await Promise.all(
    submissions.map(async (submission) => {
      const [attachments, recognitions, revisionAttachments] =
        await Promise.all([
          mapFilesByType(
            submission.files,
            SubmissionFileType.ATTACHMENT,
            blobServiceClient!,
            containerName!
          ),
          mapFilesByType(
            submission.files,
            SubmissionFileType.RECOGNITION,
            blobServiceClient!,
            containerName!
          ),
          mapFilesByType(
            submission.files,
            SubmissionFileType.REVISION_ATTACHMENT,
            blobServiceClient!,
            containerName!
          ),
        ]);

      const ciLink = submission.subject.carbonInventory;

      const baseEntry = {
        submissionId: submission.id.toString(),
        submissionType: submission.type,
        status: submission.status,
        userName: buildUserName(
          submission.creator?.firstName ?? null,
          submission.creator?.lastName ?? null
        ),
        userMetadata: orgName,
        carbonInventoryId: ciLink?.carbonInventoryId.toString() ?? null,
        organizationId: organizationId.toString(),
        organizationData,
      };

      const reviewedEventType = deriveEventType(submission.status);
      const postulationEvent: SubmissionHistoryEntry = {
        ...baseEntry,
        eventType: SubmissionEventType.POSTULATION,
        date: submission.createdAt.toISOString(),
        comment: "",
        files: attachments,
        recognitions: [],
      };

      if (reviewedEventType === SubmissionEventType.POSTULATION) {
        return { postulationEvent, reviewedEvent: null };
      }

      const reviewedEvent: SubmissionHistoryEntry = {
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
      };

      return { postulationEvent, reviewedEvent };
    })
  );

  if (!submissionEventGroups.length) {
    return selfDeclarationEvent ? [selfDeclarationEvent] : [];
  }

  const response: SubmissionHistoryEntry[] = submissionEventGroups.flatMap(
    ({ postulationEvent, reviewedEvent }, submissionIndex) => {
      if (!reviewedEvent) return [postulationEvent];

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
