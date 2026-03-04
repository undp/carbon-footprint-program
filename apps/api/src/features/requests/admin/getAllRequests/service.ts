import type { PrismaClient } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";
import {
  adminSubmissionSummaryViewSelect,
  mapAdminSubmissionSummaryToResponse,
} from "../mappers.js";

export const getAllRequestsService = async (
  prismaClient: PrismaClient
): Promise<GetAllAdminRequestsResponse> => {
  const submissions = await prismaClient.submissionSummaryView.findMany({
    select: adminSubmissionSummaryViewSelect,
    orderBy: [{ requestedAt: "desc" }, { submissionId: "desc" }],
  });

  return submissions.map(mapAdminSubmissionSummaryToResponse);
};
