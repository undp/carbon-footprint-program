import type { PrismaClient } from "@repo/database";
import { SubmissionType, SubmissionStatus } from "@repo/database";
import type { GetAdminRequestsKpisResponse } from "@repo/types";
import { flatMap, sumBy } from "lodash-es";

export const getRequestsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetAdminRequestsKpisResponse> => {
  const submissionCounts = await prismaClient.submissionSummaryView.groupBy({
    by: ["type", "status"],
    _count: true,
  });

  const bucket = new Map<string, number>();
  for (const sub of submissionCounts) {
    const key = `${sub.type}:${sub.status}`;
    bucket.set(key, sub._count);
  }

  const types = Object.values(SubmissionType);
  const statuses = Object.values(SubmissionStatus);

  const counts = flatMap(types, (type) =>
    statuses.map((status) => {
      const key = `${type}:${status}`;
      return {
        type,
        status,
        value: bucket.get(key) ?? 0,
      };
    })
  );

  return {
    total: sumBy(counts, "value"),
    counts,
  };
};
