import { type BadgeType, type PrismaClient, BadgeStatus } from "@repo/database";
import type { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import type { ConfirmBadgeUploadResponse } from "@repo/types";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import { generateReadSasUrl } from "@/services/blobService.js";
import { BADGE_UPLOAD_MAX_BYTES } from "@/config/environment.js";
import createError from "@fastify/error";

const BADGE_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/svg+xml",
  "image/jpeg",
  "image/webp",
];

export const BadgeFileMimeTypeError = createError(
  "BADGE_FILE_MIME_TYPE_ERROR",
  "Unsupported mime type '%s'. Allowed types: " +
    BADGE_ALLOWED_MIME_TYPES.join(", "),
  400
);

export const BadgeFileSizeError = createError(
  "BADGE_FILE_SIZE_ERROR",
  "File size %s bytes exceeds the maximum allowed size of %s bytes",
  400
);

export async function persistBadgeFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistFileRecordParams,
  type: BadgeType,
  blobServiceClient?: BlobServiceClient,
  containerName?: string
): Promise<ConfirmBadgeUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    blobStorage,
    params.blobPath,
    params.uuid
  );

  if (!BADGE_ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new BadgeFileMimeTypeError(mimeType);
  }

  if (sizeBytes > BADGE_UPLOAD_MAX_BYTES) {
    throw new BadgeFileSizeError(sizeBytes, BADGE_UPLOAD_MAX_BYTES);
  }

  const fileWithBadge = await prisma.$transaction(async (tx) => {
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
        badge: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  });

  const badge = fileWithBadge.badge!;

  let previewUrl: string;
  if (blobServiceClient && containerName) {
    const result = await generateReadSasUrl(
      blobServiceClient,
      containerName,
      params.blobPath,
      { contentType: mimeType }
    );
    previewUrl = result.url;
  } else {
    previewUrl = blobStorage.getBlobClient(params.blobPath).url;
  }

  return {
    badge: {
      id: badge.id.toString(),
      type: badge.type,
      status: badge.status,
      createdAt: badge.createdAt.toISOString(),
      fileName: fileWithBadge.originalName,
      mimeType: fileWithBadge.mimeType,
      previewUrl,
    },
  };
}
