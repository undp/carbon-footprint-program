import type { PrismaClient } from "@repo/database";
import { SubmissionSubjectType, SubmissionStatus } from "@repo/database";
import type { GetAdminRequestsKpisResponse } from "@repo/types";
import { flatMap, sumBy } from "lodash-es";

export const getRequestsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetAdminRequestsKpisResponse> => {
  const submissionCounts = await prismaClient.submissionSummaryView.groupBy({
    by: ["subjectType", "status"],
    _count: true,
  });

  const types = Object.values(SubmissionSubjectType);
  const statuses = Object.values(SubmissionStatus);

  const counts = flatMap(types, (type) =>
    statuses.map((status) => {
      const row = submissionCounts.find(
        (r) => r.subjectType === type && r.status === status
      );
      return {
        type,
        status,
        value: row?._count ?? 0,
      };
    })
  );

  const total = sumBy(submissionCounts, "_count");

  return {
    total,
    counts,
  };
};
