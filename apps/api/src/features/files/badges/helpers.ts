import { type BadgeType, type PrismaClient, BadgeStatus } from "@repo/database";
import type { ConfirmBadgeUploadResponse, BadgeDTO } from "@repo/types";
import {
  checkFileRecordExists,
  type PersistFileRecordParams,
} from "../helpers/persistFileRecord.js";
import {
  BADGE_ALLOWED_MIME_TYPES,
  BADGE_UPLOAD_MAX_BYTES,
} from "@/config/constants.js";
import { BadgeUploadValidationError } from "./errors.js";
import type { StorageAdapter } from "@/services/storage/index.js";

export async function persistBadgeFileRecord(
  prisma: PrismaClient,
  storage: StorageAdapter,
  params: PersistFileRecordParams,
  type: BadgeType
): Promise<ConfirmBadgeUploadResponse> {
  const { sizeBytes, mimeType } = await checkFileRecordExists(
    storage,
    params.blobPath,
    params.uuid
  );

  if (!(BADGE_ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw new BadgeUploadValidationError(
      `Unsupported file type "${mimeType}". Allowed types: ${BADGE_ALLOWED_MIME_TYPES.join(", ")}`
    );
  }

  if (sizeBytes > BADGE_UPLOAD_MAX_BYTES) {
    throw new BadgeUploadValidationError(
      `File size ${sizeBytes} bytes exceeds the maximum allowed size of ${BADGE_UPLOAD_MAX_BYTES} bytes`
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
  const signUrl = await storage.createReadUrlSigner();
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
