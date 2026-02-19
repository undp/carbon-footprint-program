import type { PrismaClient, SubmissionFileType } from "@repo/database";
import type { ContainerClient } from "@azure/storage-blob";
import type { FileType, ConfirmUploadResponse } from "@repo/types";
import { FileNotFoundError } from "../errors.js";
import {
  validateFileTypeExists,
  createFileLink,
  buildBlobPath,
} from "../helpers.js";
import { mapFileToResponse } from "../mappers.js";

interface ConfirmUploadInput {
  fileType: FileType;
  ownerId: string;
  uuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  submissionFileType?: SubmissionFileType;
  userId: string;
}

export const confirmUploadService = async (
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  input: ConfirmUploadInput
): Promise<ConfirmUploadResponse> => {
  const {
    fileType,
    ownerId,
    uuid,
    originalName,
    mimeType,
    sizeBytes,
    submissionFileType,
    userId,
  } = input;
  const ownerIdBigInt = BigInt(ownerId);

  await validateFileTypeExists(prisma, fileType, ownerIdBigInt);

  // Verify the blob was actually uploaded
  const blobPath = buildBlobPath(fileType, ownerId, uuid, originalName);
  const blobClient = blobStorage.getBlobClient(blobPath);
  const exists = await blobClient.exists();
  if (!exists) {
    throw new FileNotFoundError(uuid);
  }

  // Create file record + link in a transaction
  const file = await prisma.$transaction(async (tx) => {
    const createdFile = await tx.file.create({
      data: {
        uuid,
        originalName,
        mimeType,
        sizeBytes,
        blobPath,
        createdById: BigInt(userId),
      },
    });

    await createFileLink(
      tx,
      fileType,
      createdFile.id,
      ownerIdBigInt,
      submissionFileType
    );

    return createdFile;
  });

  return mapFileToResponse(file);
};
