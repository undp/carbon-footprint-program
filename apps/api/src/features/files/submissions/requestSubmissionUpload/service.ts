import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import {
  FileType,
  type RequestSubmissionUploadBody,
  type RequestSubmissionUploadParams,
  type RequestSubmissionUploadResponse,
} from "@repo/types";
import { validateSubmissionExists } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "../../helpers/sasHelper.js";

type SubmissionRequestUploadInput = RequestSubmissionUploadBody &
  RequestSubmissionUploadParams;

export const submissionRequestUploadService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  accountName: string,
  containerName: string,
  input: SubmissionRequestUploadInput
): Promise<RequestSubmissionUploadResponse> => {
  const { submissionId, originalName, submissionFileType } = input;

  await validateSubmissionExists(prisma, submissionId);

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: FileType.SUBMISSION,
    groupKey: submissionId,
    subPath: submissionFileType,
    uuid: fileUuid,
    name: originalName,
  });

  const { url, expiresAt } = await generateWriteSasUrl(
    blobServiceClient,
    accountName,
    containerName,
    blobPath
  );

  return {
    uuid: fileUuid,
    uploadUrl: url,
    expiresAt: expiresAt.toISOString(),
  };
};
