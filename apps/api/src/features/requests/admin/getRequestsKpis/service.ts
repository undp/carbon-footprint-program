import type { PrismaClient } from "@repo/database";
import { SubmissionSubjectType, SubmissionStatus } from "@repo/database";
import type { GetAdminRequestsKpisResponse } from "@repo/types";

export const getRequestsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetAdminRequestsKpisResponse> => {
  const submissionCounts = await prismaClient.submissionSummaryView.groupBy({
    by: ["subjectType", "status"],
    _count: true,
  });

  const countMap = new Map<
    SubmissionSubjectType,
    Map<SubmissionStatus, number>
  >();
  const types = Object.values(SubmissionSubjectType);
  const statuses = Object.values(SubmissionStatus);

  for (const type of types) {
    countMap.set(type, new Map());
    for (const status of statuses) {
      countMap.get(type)!.set(status, 0);
    }
  }

  let total = 0;
  for (const row of submissionCounts) {
    const typeMap = countMap.get(row.subjectType);
    if (typeMap) {
      typeMap.set(row.status, row._count);
    }
    total += row._count;
  }

  const counts: {
    type: SubmissionSubjectType;
    status: SubmissionStatus;
    value: number;
  }[] = [];
  for (const [type, statusMap] of countMap) {
    for (const [status, value] of statusMap) {
      counts.push({ type, status, value });
    }
  }

  return {
    total,
    counts,
  };
};
