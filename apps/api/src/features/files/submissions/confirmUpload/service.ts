import type { PrismaClient } from "@repo/database";
import type { SubmissionFileType } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import { FileType, type SubmissionConfirmUploadResponse } from "@repo/types";
import { validateSubmissionExists, createSubmissionFile } from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";
import { persistFileRecord } from "../../shared/persistFileRecord.js";

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

  return persistFileRecord(
    prisma,
    blobStorage,
    { uuid, blobPath, originalName, userId },
    (tx, fileId) =>
      createSubmissionFile(tx, fileId, submissionId, submissionFileType)
  );
};
