import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import {
  ConfirmBadgeUploadBody,
  ConfirmBadgeUploadParams,
  FileType,
  type ConfirmBadgeUploadResponse,
} from "@repo/types";
import { validateBadgeType, persistBadgeFileRecord } from "../helpers.js";
import { buildBlobPath } from "../../shared/buildBlobPath.js";

type BadgeConfirmUploadInput = ConfirmBadgeUploadBody &
  ConfirmBadgeUploadParams & { userId: string };

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput
): Promise<ConfirmBadgeUploadResponse> => {
  const { badgeType, uuid, originalName, userId } = input;

  validateBadgeType(badgeType);

  const blobPath = buildBlobPath({
    fileType: FileType.BADGE,
    ownerId: badgeType,
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
      userId,
    },
    badgeType
  );
};
