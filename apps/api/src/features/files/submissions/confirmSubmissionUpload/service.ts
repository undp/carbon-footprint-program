import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  ConfirmSubmissionUploadBody,
  ConfirmSubmissionUploadParams,
  FileType,
  type ConfirmSubmissionUploadResponse,
} from "@repo/types";
import { validateSubmissionExists, createSubmissionFile } from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";
import { persistFileRecord } from "../../shared/persistFileRecord.js";

type SubmissionConfirmUploadInput = ConfirmSubmissionUploadBody &
  ConfirmSubmissionUploadParams & {
    userId: string;
  };

export const submissionConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: SubmissionConfirmUploadInput
): Promise<ConfirmSubmissionUploadResponse> => {
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
