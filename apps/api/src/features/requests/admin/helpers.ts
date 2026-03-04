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
): Promise<void> => {
  const result = await prismaClient.submission.updateMany({
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

  if (result.count === 0) {
    throw new SubmissionUpdateError(submissionId);
  }
};
