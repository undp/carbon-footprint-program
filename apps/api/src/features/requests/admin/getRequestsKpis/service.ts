import type { PrismaClient } from "@repo/database";
import { SubmissionSubjectType, SubmissionStatus } from "@repo/database";
import type { GetAdminRequestsKpisResponse } from "@repo/types";

export const getRequestsKpisService = async (
  prismaClient: PrismaClient
): Promise<GetAdminRequestsKpisResponse> => {
  const submissions = await prismaClient.submission.findMany({
    include: {
      subject: {
        select: { subjectType: true },
      },
    },
  });

  const countMap = new Map<string, number>();
  const types = Object.values(SubmissionSubjectType);
  const statuses = Object.values(SubmissionStatus);

  for (const type of types) {
    for (const status of statuses) {
      countMap.set(`${type}-${status}`, 0);
    }
  }

  for (const submission of submissions) {
    const key = `${submission.subject.subjectType}-${submission.status}`;
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const counts = Array.from(countMap.entries()).map(([key, value]) => {
    const separatorIndex = key.lastIndexOf("-");
    const type = key.substring(0, separatorIndex) as SubmissionSubjectType;
    const status = key.substring(separatorIndex + 1) as SubmissionStatus;
    return { type, status, value };
  });

  return {
    total: submissions.length,
    counts,
  };
};
