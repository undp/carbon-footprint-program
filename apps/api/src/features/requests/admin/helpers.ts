import { SubmissionStatus } from "@repo/database";
import type { PrismaClient } from "@repo/database";
import type { User } from "@repo/types";
import {
  SubmissionNotFoundError,
  SubmissionNotPendingError,
} from "../errors.js";

type SubmissionTargetStatus =
  | typeof SubmissionStatus.APPROVED
  | typeof SubmissionStatus.REJECTED;

export const updatePendingSubmissionStatus = async (
  prismaClient: PrismaClient,
  submissionId: string,
  targetStatus: SubmissionTargetStatus,
  reviewComments: string,
  userId: User["id"]
): Promise<{ submissionId: string }> => {
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
    const submission = await prismaClient.submission.findUnique({
      where: { id: BigInt(submissionId) },
    });
    if (!submission) {
      throw new SubmissionNotFoundError(submissionId);
    }
    throw new SubmissionNotPendingError(submissionId);
  }

  return { submissionId };
};
