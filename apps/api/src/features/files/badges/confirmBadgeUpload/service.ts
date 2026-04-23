import type { PrismaClient } from "@repo/database";
import type { ContainerClient, BlobServiceClient } from "@azure/storage-blob";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { FileType } from "@repo/types";
import { persistBadgeFileRecord } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams & { userId?: string };

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  input: BadgeConfirmUploadInput
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName, userId } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    groupKey: badgeType,
    uuid,
    name: originalName,
  });

  return persistBadgeFileRecord(
    prisma,
    blobStorage,
    blobServiceClient,
    containerName,
    { uuid, blobPath, originalName, userId },
    badgeType
  );
};
