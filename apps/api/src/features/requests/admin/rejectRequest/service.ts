import type { PrismaClient } from "@repo/database";
import { SubmissionStatus, SubmissionFileType } from "@repo/database";
import type {
  RejectRequestBody,
  RejectRequestResponse,
  User,
} from "@repo/types";
import {
  attachFilesToSubmission,
  updatePendingSubmissionStatus,
} from "../helpers.js";

export const rejectRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: RejectRequestBody,
  userId: User["id"]
): Promise<RejectRequestResponse> => {
  await prismaClient.$transaction(async (tx) => {
    const submissionIdBigInt = BigInt(submissionId);

    await updatePendingSubmissionStatus(
      tx,
      submissionId,
      SubmissionStatus.REJECTED,
      userId,
      { reviewComments: body.reviewComments }
    );

    if (body.reviewFileUuids?.length) {
      await attachFilesToSubmission(tx, submissionIdBigInt, [
        {
          uuids: body.reviewFileUuids,
          type: SubmissionFileType.REVIEW_ATTACHMENT,
        },
      ]);
    }
  });

  return {};
};
