import type { PrismaClient } from "@repo/database";
import type { GetOrganizationHistoryResponse } from "@repo/types";
import {
  createHistoryReadSasSigner,
  getOrgSummaryDetails,
  submissionHistorySelect,
} from "../helpers.js";
import { mapTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";
import type { StorageAdapter } from "@repo/storage";

export const getOrganizationHistoryService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
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

  const signReadUrl = await createHistoryReadSasSigner(submissions, storage);

  const submissionEventGroups = await Promise.all(
    submissions.map((submission) =>
      mapSubmissionEventGroup(submission, orgHistorySummary, signReadUrl)
    )
  );

  return mapTimelineResponse(submissionEventGroups);
};
