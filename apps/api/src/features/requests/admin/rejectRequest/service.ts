import type { PrismaClient } from "@repo/database";
import { SubmissionStatus } from "@repo/database";
import type {
  RejectRequestBody,
  RejectRequestResponse,
  User,
} from "@repo/types";
import { updatePendingSubmissionStatus } from "../helpers.js";

export const rejectRequestService = async (
  prismaClient: PrismaClient,
  submissionId: string,
  body: RejectRequestBody,
  userId: User["id"]
): Promise<RejectRequestResponse> => {
  return await updatePendingSubmissionStatus(
    prismaClient,
    submissionId,
    SubmissionStatus.REJECTED,
    body,
    userId
  );
};
