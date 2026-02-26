import type { PrismaClient } from "@repo/database";
import type { GetAllAdminRequestsResponse } from "@repo/types";

export const getAllRequestsService = async (
  prismaClient: PrismaClient
): Promise<GetAllAdminRequestsResponse> => {
  const submissions = await prismaClient.submission.findMany({
    select: {
      id: true,
      status: true,
      createdAt: true,
      subject: {
        select: {
          subjectType: true,
        },
      },
      summary: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return submissions.map((submission) => {
    return {
      id: submission.id.toString(),
      organizationName: submission.summary!.organizationName,
      type: submission.subject.subjectType,
      year: submission.summary!.period,
      status: submission.status,
      requestedAt: submission.createdAt.toISOString(),
    };
  });
};
