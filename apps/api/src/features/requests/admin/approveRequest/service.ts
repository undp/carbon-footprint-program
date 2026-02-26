import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type {
  ApproveRequestBody,
  ApproveRequestResponse,
  User,
} from "@repo/types";
import { updateSubmissionStatus } from "../helpers.js";

export const approveRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: ApproveRequestBody,
  userId: User["id"]
): Promise<ApproveRequestResponse> => {
  return await updateSubmissionStatus(
    prismaClient,
    submissionId,
    SubmissionStatus.APPROVED,
    body,
    userId
  );
};
