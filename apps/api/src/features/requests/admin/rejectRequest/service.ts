import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type {
  RejectRequestBody,
  RejectRequestResponse,
  User,
} from "@repo/types";
import {
  SubmissionNotFoundError,
  SubmissionNotPendingError,
} from "../../errors.js";

export const rejectRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: RejectRequestBody,
  user: User | null
): Promise<RejectRequestResponse> => {
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
      status: SubmissionStatus.REJECTED,
      reviewerId: user ? BigInt(user.id) : undefined,
      reviewComments: body.reviewComments,
      updatedById: user ? BigInt(user.id) : undefined,
    },
  });

  return { submissionId };
};
