import { type BadgeType, type PrismaClient, BadgeStatus } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import type { ConfirmBadgeUploadResponse } from "@repo/types";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import { mapFileToResponse } from "../mappers.js";

export async function persistBadgeFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistFileRecordParams,
  type: BadgeType
): Promise<ConfirmBadgeUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    params.blobPath,
    params.uuid
  );

  const file = await prisma.$transaction(async (tx) => {
    await tx.badge.updateMany({
      where: { type, status: BadgeStatus.ACTIVE },
      data: { status: BadgeStatus.INACTIVE },
    });

    return tx.file.create({
      data: {
        uuid: params.uuid,
        originalName: params.originalName,
        mimeType,
        sizeBytes,
        blobPath: params.blobPath,
        createdById: BigInt(params.userId),
        badge: {
          create: {
            type,
            status: BadgeStatus.ACTIVE,
          },
        },
      },
    });
  });

  return mapFileToResponse(file);
}
