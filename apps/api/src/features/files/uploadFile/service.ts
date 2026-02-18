import { randomUUID } from "crypto";
import type { PrismaClient } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import type { FileType, UploadFileResponse } from "@repo/types";
import { FileUploadFailedError } from "../errors.js";
import { validateFileTypeExists, createFileLink } from "../helpers.js";
import { mapFileToResponse } from "../mappers.js";

interface UploadFileInput {
  fileType: FileType;
  ownerId: string;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  userId: string;
}

export const uploadFileService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: UploadFileInput
): Promise<UploadFileResponse> => {
  const { fileType, ownerId, originalName, mimeType, buffer, userId } = input;
  const ownerIdBigInt = BigInt(ownerId);

  await validateFileTypeExists(prisma, fileType, ownerIdBigInt);

  const fileUuid = randomUUID();

  // Build a unique blob path
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobPath = `${fileType}/${ownerId}/${fileUuid}-${sanitizedName}`;

  const blockBlobClient = blobStorage.getBlockBlobClient(blobPath);

  try {
    // Upload to blob storage
    try {
      await blockBlobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: mimeType },
      });
    } catch (error) {
      throw new FileUploadFailedError((error as Error).message);
    }

    // Create file record + link table in a transaction
    const file = await prisma.$transaction(async (tx) => {
      const createdFile = await tx.file.create({
        data: {
          uuid: fileUuid,
          fileType,
          originalName,
          mimeType,
          sizeBytes: buffer.length,
          blobPath,
          createdById: BigInt(userId),
        },
      });

      await createFileLink(tx, fileType, createdFile.id, ownerIdBigInt);

      return createdFile;
    });

    return mapFileToResponse(file);
  } catch (error) {
    // Attempt to clean up the uploaded blob to avoid orphaned storage objects.
    // Log but do not swallow the cleanup error so the original error is preserved.
    try {
      await blockBlobClient.deleteIfExists();
    } catch (cleanupError) {
      // eslint-disable-next-line no-console
      console.error(
        "Failed to delete orphaned blob after upload error:",
        cleanupError
      );
    }
    throw error;
  }
};
