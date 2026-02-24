import type { PrismaClient } from "@repo/database";
import type { BadgeType } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import { FileType, type BadgeConfirmUploadResponse } from "@repo/types";
import { validateBadgeType, createBadgeEntry } from "../helpers.js";
import { buildBlobPath } from "../../helpers/buildBlobPath.js";
import { persistBadgeFileRecord } from "../helpers.js";

interface BadgeConfirmUploadInput {
  badgeType: BadgeType;
  uuid: string;
  originalName: string;
  userId: string;
}

export const badgeConfirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: BadgeConfirmUploadInput
): Promise<BadgeConfirmUploadResponse> => {
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
    { uuid, blobPath, originalName, userId },
    badgeType
  );
};
