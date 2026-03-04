import { SubmissionStatus } from "@repo/database";
import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import { SubmissionUpdateError } from "../errors.js";

type SubmissionTargetStatus =
  | typeof SubmissionStatus.APPROVED
  | typeof SubmissionStatus.REJECTED;

export const updatePendingSubmissionStatus = async (
  prismaClient: PrismaClient,
  submissionId: string,
  targetStatus: SubmissionTargetStatus,
  userId: User["id"],
  reviewComments?: string
): Promise<{ submissionId: string }> => {
  const result = await prismaClient.submission.update({
    where: {
      id: BigInt(submissionId),
      status: SubmissionStatus.PENDING,
    },
    data: {
      status: targetStatus,
      reviewerId: BigInt(userId),
      reviewComments,
      updatedById: BigInt(userId),
    },
  });

  if (!result) {
    throw new SubmissionUpdateError(submissionId);
  }

  return { submissionId };
};
