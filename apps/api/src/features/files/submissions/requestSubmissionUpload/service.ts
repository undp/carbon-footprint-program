import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type {
  RequestSubmissionUploadBody,
  RequestSubmissionUploadParams,
  RequestSubmissionUploadResponse,
} from "@repo/types";
import { validateSubmissionExists } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "../../helpers/sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

type SubmissionRequestUploadInput = RequestSubmissionUploadBody &
  RequestSubmissionUploadParams;

export const submissionRequestUploadService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  input: SubmissionRequestUploadInput
): Promise<RequestSubmissionUploadResponse> => {
  const { submissionId, originalName, submissionFileType } = input;

  await validateSubmissionExists(prisma, submissionId);

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: "SUBMISSION",
    ownerId: submissionId,
    subPath: submissionFileType,
    uuid: fileUuid,
    name: originalName,
  });

  const { url, expiresAt } = await generateWriteSasUrl(
    blobServiceClient,
    AZURE_STORAGE_ACCOUNT_NAME!,
    AZURE_STORAGE_CONTAINER_NAME,
    blobPath
  );

  return {
    uuid: fileUuid,
    uploadUrl: url,
    expiresAt: expiresAt.toISOString(),
  };
};
