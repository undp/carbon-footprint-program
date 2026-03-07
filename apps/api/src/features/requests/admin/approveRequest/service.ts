import type { PrismaClient, BadgeType } from "@repo/database";
import { SubmissionStatus, BadgeStatus } from "@repo/database";
import type {
  ApproveRequestBody,
  ApproveRequestResponse,
  User,
} from "@repo/types";
import { SubmissionUpdateError } from "../../errors.js";

export const approveRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ApproveRequestBody,
  userId: User["id"]
): Promise<ApproveRequestResponse> => {
  await prismaClient.$transaction(async (tx) => {
    // 1. Get the submission to verify it's PENDING and get its type
    const submission = await tx.submission.findUnique({
      where: { id: BigInt(submissionId) },
      select: { status: true, type: true },
    });

    if (!submission || submission.status !== SubmissionStatus.PENDING) {
      throw new SubmissionUpdateError(submissionId);
    }

    // 2. Find the active badge for the submission type
    // BadgeType matches SubmissionType, so we can use the same value
    const activeBadge = await tx.badge.findFirst({
      where: {
        type: submission.type as unknown as BadgeType,
        status: BadgeStatus.ACTIVE,
      },
      select: { id: true },
    });

    // 3. Update submission with status and badgeId in a single operation
    await tx.submission.update({
      where: { id: BigInt(submissionId) },
      data: {
        status: SubmissionStatus.APPROVED,
        reviewerId: BigInt(userId),
        reviewComments: body.reviewComments,
        updatedById: BigInt(userId),
        badgeId: activeBadge?.id,
      },
    });
  });

  return {};
};
