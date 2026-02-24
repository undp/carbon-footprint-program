import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import {
  FileType,
  RequestBadgeUploadBody,
  RequestBadgeUploadParams,
  RequestBadgeUploadResponse,
} from "@repo/types";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { generateWriteSasUrl } from "../../helpers/sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

type BadgeRequestUploadInput = RequestBadgeUploadBody &
  RequestBadgeUploadParams;

export const badgeRequestUploadService = async (
  _prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  input: BadgeRequestUploadInput
): Promise<RequestBadgeUploadResponse> => {
  const { badgeType, originalName } = input;

  const fileUuid = randomUUID();
  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    ownerId: badgeType,
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
