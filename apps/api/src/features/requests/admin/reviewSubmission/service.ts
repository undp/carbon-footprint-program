import type { PrismaClient } from "@repo/database";
import { SubmissionStatus, SubmissionFileType } from "@repo/database";
import {
  ReviewSubmissionBody,
  ReviewSubmissionResponse,
  User,
} from "@repo/types";
import {
  attachFilesToSubmission,
  updatePendingSubmissionStatus,
} from "../helpers.js";

//TODO: Move this service to submissions routes and folder
export const reviewSubmissionService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ReviewSubmissionBody,
  userId: User["id"]
): Promise<ReviewSubmissionResponse> => {
  await prismaClient.$transaction(async (tx) => {
    const submissionIdBigInt = BigInt(submissionId);

    await updatePendingSubmissionStatus(
      tx,
      submissionId,
      SubmissionStatus.OBJECTED,
      userId,
      { reviewComments: body.reviewComments }
    );

    if (body.revisionFileUuids?.length) {
      await attachFilesToSubmission(tx, submissionIdBigInt, [
        {
          uuids: body.revisionFileUuids,
          type: SubmissionFileType.REVISION_ATTACHMENT,
        },
      ]);
    }
  });

  return {};
};
