import {
  BadgeType,
  type PrismaClient,
  type Prisma,
  BadgeStatus,
} from "@repo/database";
import { type ContainerClient } from "@azure/storage-blob";
import { type ConfirmUploadResponse } from "@repo/types";
import { FileTypeNotFoundError } from "../errors.js";
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
): Promise<ConfirmUploadResponse> {
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

export function validateBadgeType(type: BadgeType): void {
  if (!Object.values(BadgeType).includes(type)) {
    throw new FileTypeNotFoundError("BadgeType", type);
  }
}

export async function createBadgeEntry(
  tx: Prisma.TransactionClient,
  fileId: bigint,
  type: BadgeType
): Promise<void> {
  await tx.badge.updateMany({
    where: { type, status: BadgeStatus.ACTIVE },
    data: { status: BadgeStatus.INACTIVE },
  });
  await tx.badge.create({
    data: { type, fileId, status: BadgeStatus.ACTIVE },
  });
}

export async function findActiveBadgeByType(
  prisma: PrismaClient,
  type: BadgeType
): Promise<bigint[]> {
  const badge = await prisma.badge.findFirst({
    where: { type, status: BadgeStatus.ACTIVE },
    select: { fileId: true },
  });
  return badge ? [badge.fileId] : [];
}
