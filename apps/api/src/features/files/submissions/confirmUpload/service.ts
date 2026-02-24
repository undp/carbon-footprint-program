import type { PrismaClient } from "@repo/database";
import type { SubmissionFileType } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import { FileType, type SubmissionConfirmUploadResponse } from "@repo/types";
import { validateSubmissionExists } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { persistSubmissionFileRecord } from "../helpers.js";

interface SubmissionConfirmUploadInput {
  submissionId: string;
  uuid: string;
  originalName: string;
  submissionFileType: SubmissionFileType;
  userId: string;
}

export const submissionConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: SubmissionConfirmUploadInput
): Promise<SubmissionConfirmUploadResponse> => {
  const { submissionId, uuid, originalName, submissionFileType, userId } =
    input;

  await validateSubmissionExists(prisma, submissionId);

  const blobPath = buildBlobPath({
    fileType: FileType.SUBMISSION,
    ownerId: submissionId,
    subPath: submissionFileType,
    uuid,
    name: originalName,
  });

  return persistSubmissionFileRecord(
    prisma,
    blobStorage,
    { uuid, blobPath, originalName, userId },
    submissionId,
    submissionFileType
  );
};
