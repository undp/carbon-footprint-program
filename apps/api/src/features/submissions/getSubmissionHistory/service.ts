import type { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@repo/database";
import {
  type GetSubmissionHistoryQuery,
  type SubmissionHistoryEntry,
} from "@repo/types";
import {
  buildSelfDeclarationEvent,
  createHistoryReadSasSigner,
  fetchOrgHistoryDetails,
  determineSubmissionScope,
  submissionHistorySelect,
  SubmissionHistoryUser,
} from "../helpers.js";
import { buildTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";

export const getSubmissionHistoryService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null,
  query: GetSubmissionHistoryQuery,
  user: SubmissionHistoryUser
): Promise<SubmissionHistoryEntry[]> => {
  const scope = await determineSubmissionScope(prisma, query, user);

  if (!scope) {
    return [];
  }

  const [historyContext, submissions] = await Promise.all([
    fetchOrgHistoryDetails(prisma, scope.organizationId),
    prisma.submission.findMany({
      where: scope.submissionWhere,
      select: submissionHistorySelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const signReadSasUrl = await createHistoryReadSasSigner(
    submissions,
    blobServiceClient,
    containerName
  );

  const submissionEventGroups = await Promise.all(
    submissions.map((submission) =>
      mapSubmissionEventGroup(submission, historyContext, signReadSasUrl)
    )
  );

  return buildTimelineResponse(
    submissionEventGroups,
    buildSelfDeclarationEvent(scope, historyContext)
  );
};
