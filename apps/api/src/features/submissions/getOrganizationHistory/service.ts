import type { BlobServiceClient } from "@azure/storage-blob";
import type { PrismaClient } from "@repo/database";
import type { GetOrganizationHistoryResponse } from "@repo/types";
import {
  createHistoryReadSasSigner,
  getOrgSummaryDetails,
  submissionHistorySelect,
} from "../helpers.js";
import { mapTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";

export const getOrganizationHistoryService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient | null,
  containerName: string | null,
  organizationId: string
): Promise<GetOrganizationHistoryResponse> => {
  const orgId = BigInt(organizationId);

  const [orgHistorySummary, submissions] = await Promise.all([
    getOrgSummaryDetails(prisma, orgId),
    prisma.submission.findMany({
      where: {
        subject: {
          organizationData: {
            organizationData: { organizationId: orgId },
          },
        },
      },
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
      mapSubmissionEventGroup(submission, orgHistorySummary, signReadSasUrl)
    )
  );

  return mapTimelineResponse(submissionEventGroups);
};
