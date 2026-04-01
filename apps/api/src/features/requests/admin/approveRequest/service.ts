import type { PrismaClient } from "@repo/database";
import {
  SubmissionStatus,
  BadgeStatus,
  SubmissionFileType,
} from "@repo/database";
import type {
  ApproveRequestBody,
  ApproveRequestResponse,
  User,
} from "@repo/types";
import { SubmissionUpdateError } from "../../errors.js";
import {
  attachFilesToSubmission,
  updatePendingSubmissionStatus,
} from "../helpers.js";

export const approveRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ApproveRequestBody,
  userId: User["id"]
): Promise<ApproveRequestResponse> => {
  await prismaClient.$transaction(async (tx) => {
    const submissionIdBigInt = BigInt(submissionId);

    // 1. Get the submission to verify it's PENDING and get its type
    const submission = await tx.submission.findUnique({
      where: { id: submissionIdBigInt },
      select: { status: true, type: true },
    });

    if (!submission || submission.status !== SubmissionStatus.PENDING) {
      throw new SubmissionUpdateError(submissionId);
    }

    // 2. Find the active badge for the submission type
    // BadgeType matches SubmissionType, so we can use the same value
    const activeBadge = await tx.badge.findFirst({
      where: {
        type: submission.type,
        status: BadgeStatus.ACTIVE,
      },
      select: { id: true },
    });

    // 3. Update submission with status and badgeId
    await updatePendingSubmissionStatus(
      tx,
      submissionId,
      SubmissionStatus.APPROVED,
      userId,
      {
        reviewComments: body.reviewComments,
        badgeId: activeBadge?.id,
      }
    );

    if (body.revisionFileUuids?.length || body.recognitionFileUuids?.length) {
      await attachFilesToSubmission(tx, submissionIdBigInt, [
        {
          uuids: body.revisionFileUuids,
          type: SubmissionFileType.REVISION_ATTACHMENT,
        },
        {
          uuids: body.recognitionFileUuids,
          type: SubmissionFileType.RECOGNITION,
        },
      ]);
    }
  });

  return {};
};
