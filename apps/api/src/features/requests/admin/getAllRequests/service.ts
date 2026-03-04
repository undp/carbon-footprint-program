import type { PrismaClient } from "@repo/database";
import type { GetAllAdminRequestsResponse, User } from "@repo/types";
import {
  adminSubmissionSummaryViewSelect,
  mapAdminSubmissionSummaryToResponse,
} from "../mappers.js";

export const getAllRequestsService = async (
  prismaClient: PrismaClient,
  _query: null,
  _user: User | null
): Promise<GetAllAdminRequestsResponse> => {
  const submissions = await prismaClient.submissionSummaryView.findMany({
    select: adminSubmissionSummaryViewSelect,
    orderBy: [{ requestedAt: "desc" }, { submissionId: "desc" }],
  });

  return submissions.map(mapAdminSubmissionSummaryToResponse);
};
