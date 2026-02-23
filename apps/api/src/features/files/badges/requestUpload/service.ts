import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import type { BadgeType } from "@repo/database";
import { FileType, type BadgeRequestUploadResponse } from "@repo/types";
import { validateBadgeType } from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";
import { generateWriteSasUrl } from "../../shared/sasHelper.js";
import {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER_NAME,
} from "@/config/environment.js";

interface BadgeRequestUploadInput {
  badgeType: BadgeType;
  originalName: string;
  mimeType: string;
}

export const badgeRequestUploadService = async (
  _prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  input: BadgeRequestUploadInput
): Promise<BadgeRequestUploadResponse> => {
  const { badgeType, originalName } = input;

  validateBadgeType(badgeType);

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
