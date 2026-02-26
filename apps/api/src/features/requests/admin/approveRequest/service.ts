import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type {
  ApproveRequestBody,
  ApproveRequestResponse,
  User,
} from "@repo/types";
import {
  SubmissionNotFoundError,
  SubmissionNotPendingError,
} from "../../errors.js";

export const approveRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ApproveRequestBody,
  user: User | null
): Promise<ApproveRequestResponse> => {
  const submission = await prismaClient.submission.findUnique({
    where: { id: BigInt(submissionId) },
  });

  if (!submission) {
    throw new SubmissionNotFoundError(submissionId);
  }

  if (submission.status !== SubmissionStatus.PENDING) {
    throw new SubmissionNotPendingError(submissionId);
  }

  await prismaClient.submission.update({
    where: { id: submission.id },
    data: {
      status: SubmissionStatus.APPROVED,
      reviewerId: user ? BigInt(user.id) : undefined,
      reviewComments: body.reviewComments,
      updatedById: user ? BigInt(user.id) : undefined,
    },
  });

  return { submissionId };
};
