import { type BadgeType, type PrismaClient, BadgeStatus } from "@repo/database";
import type { ContainerClient, BlobServiceClient } from "@azure/storage-blob";
import type { ConfirmBadgeUploadResponse, BadgeDTO } from "@repo/types";
import { FILE_UPLOAD_POLICIES } from "@repo/constants";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import { createReadSasUrlSigner } from "@/services/blobService.js";
import { BadgeUploadValidationError } from "./errors.js";

export async function persistBadgeFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  params: PersistFileRecordParams,
  type: BadgeType
): Promise<ConfirmBadgeUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    params.blobPath,
    params.uuid
  );

  const { allowedMimeTypes, maxBytes } = FILE_UPLOAD_POLICIES.BADGE;
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new BadgeUploadValidationError(
      `Unsupported file type "${mimeType}". Allowed types: ${allowedMimeTypes.join(", ")}`
    );
  }

  if (maxBytes !== undefined && sizeBytes > maxBytes) {
    throw new BadgeUploadValidationError(
      `File size ${sizeBytes} bytes exceeds the maximum allowed size of ${maxBytes} bytes`
    );
  }

  const file = await prisma.$transaction(async (tx) => {
    return tx.file.create({
      data: {
        uuid: params.uuid,
        originalName: params.originalName,
        mimeType,
        sizeBytes,
        blobPath: params.blobPath,
        createdById: params.userId ? BigInt(params.userId) : null,
        badge: {
          create: {
            type,
            status: BadgeStatus.INACTIVE,
          },
        },
      },
      include: {
        badge: true,
      },
    });
  });

  const badge = file.badge!;
  const signUrl = await createReadSasUrlSigner(
    blobServiceClient,
    containerName
  );
  const { url: previewUrl } = await signUrl(file.blobPath, {
    contentType: file.mimeType ?? undefined,
  });

  const badgeDTO: BadgeDTO = {
    id: badge.id.toString(),
    type: badge.type,
    status: badge.status,
    createdAt: badge.createdAt.toISOString(),
    fileName: file.originalName,
    mimeType: file.mimeType ?? "",
    previewUrl,
  };

  return { badge: badgeDTO };
}
