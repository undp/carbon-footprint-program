import type { PrismaClient } from "@repo/database";
import { SubmissionStatus, SubmissionFileType } from "@repo/database";
import { RejectRequestBody, RejectRequestResponse, User } from "@repo/types";
import { updatePendingSubmissionStatus } from "../helpers.js";

//TODO: Move this service to submissions routes and folder
export const reviewSubmissionService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: RejectRequestBody,
  userId: User["id"]
): Promise<RejectRequestResponse> => {
  await prismaClient.$transaction(async (tx) => {
    await updatePendingSubmissionStatus(
      tx,
      submissionId,
      SubmissionStatus.OBJECTED,
      userId,
      { reviewComments: body.reviewComments }
    );

    if (body.revisionFileUuids?.length) {
      const files = await tx.file.findMany({
        where: { uuid: { in: body.revisionFileUuids } },
        select: { id: true },
      });
      await tx.submissionFile.createMany({
        data: files.map((f) => ({
          fileId: f.id,
          submissionId: BigInt(submissionId),
          type: SubmissionFileType.REVISION_ATTACHMENT,
        })),
      });
    }
  });

  return {};
};
