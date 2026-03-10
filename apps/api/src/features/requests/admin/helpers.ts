import { SubmissionStatus } from "@repo/database";
import type { PrismaClient, Prisma } from "@repo/database";
import type { User } from "@repo/types";
import { SubmissionUpdateError } from "../errors.js";

type SubmissionTargetStatus =
  | typeof SubmissionStatus.APPROVED
  | typeof SubmissionStatus.REJECTED;

export const updatePendingSubmissionStatus = async (
  prismaClient: PrismaClient | Prisma.TransactionClient,
  submissionId: string,
  targetStatus: SubmissionTargetStatus,
  userId: User["id"],
  additionalData: Prisma.SubmissionUncheckedUpdateInput = {}
): Promise<void> => {
  const result = await prismaClient.submission.updateMany({
    where: {
      id: BigInt(submissionId),
      status: SubmissionStatus.PENDING,
    },
    data: {
      status: targetStatus,
      reviewerId: BigInt(userId),
      updatedById: BigInt(userId),
      ...additionalData,
    },
  });

  if (result.count === 0) {
    throw new SubmissionUpdateError(submissionId);
  }
};
