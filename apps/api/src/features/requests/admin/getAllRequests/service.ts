import type { PrismaClient } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";

export const getAllRequestsService = async (
  prismaClient: PrismaClient
): Promise<GetAllAdminRequestsResponse> => {
  const submissions = await prismaClient.submissionSummaryView.findMany({
    select: {
      submissionId: true,
      subjectType: true,
      status: true,
      organizationName: true,
      period: true,
      requestedAt: true,
    },
    orderBy: { requestedAt: "desc", submissionId: "desc" },
  });

  return submissions.map((submission) => ({
    id: submission.submissionId.toString(),
    organizationName: submission.organizationName,
    type: submission.subjectType,
    year: submission.period,
    status: submission.status,
    requestedAt: submission.requestedAt.toISOString(),
  }));
};
