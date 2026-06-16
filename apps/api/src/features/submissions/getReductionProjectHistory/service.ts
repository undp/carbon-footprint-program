import type { PrismaClient } from "@repo/database";
import type { GetReductionProjectHistoryResponse } from "@repo/types";
import { ReductionProjectNotFoundError } from "../../reductionProjects/errors.js";
import {
  createHistoryReadUrlSigner,
  getOrgSummaryDetails,
  submissionHistorySelect,
} from "../helpers.js";
import { mapTimelineResponse, mapSubmissionEventGroup } from "../mappers.js";
import type { StorageAdapter } from "@repo/storage";

export const getReductionProjectHistoryService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  reductionProjectId: string
): Promise<GetReductionProjectHistoryResponse> => {
  const rpId = BigInt(reductionProjectId);
  const reductionProject = await prisma.reductionProject.findUnique({
    where: { id: rpId },
    select: {
      organizationId: true,
    },
  });

  if (!reductionProject) {
    throw new ReductionProjectNotFoundError(reductionProjectId);
  }

  const [orgHistorySummary, submissions] = await Promise.all([
    getOrgSummaryDetails(prisma, reductionProject.organizationId),
    prisma.submission.findMany({
      where: {
        subject: {
          reductionProject: { reductionProjectId: rpId },
        },
      },
      select: submissionHistorySelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const signReadUrl = await createHistoryReadUrlSigner(submissions, storage);

  const submissionEventGroups = await Promise.all(
    submissions.map((submission) =>
      mapSubmissionEventGroup(submission, orgHistorySummary, signReadUrl)
    )
  );

  return mapTimelineResponse(submissionEventGroups);
};
