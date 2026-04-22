import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { persistBadgeFileRecord } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { FileType } from "@repo/types";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams;

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput,
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName } = input;

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    groupKey: badgeType,
    uuid,
    name: originalName,
  });

  return persistBadgeFileRecord(
    prisma,
    blobStorage,
    {
      uuid,
      blobPath,
      originalName,
    },
    badgeType,
    blobServiceClient,
    containerName
  );
};
