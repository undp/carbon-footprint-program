import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  ConfirmSubmissionUploadBody,
  ConfirmSubmissionUploadParams,
  FileType,
  type ConfirmSubmissionUploadResponse,
} from "@repo/types";
import {
  validateSubmissionExists,
  persistSubmissionFileRecord,
} from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";

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

  return persistSubmissionFileRecord(
    prisma,
    blobStorage,
    {
      uuid,
      blobPath,
      originalName,
      userId,
    },
    submissionId,
    submissionFileType
  );
};
