import type { BlobServiceClient } from "@azure/storage-blob";
import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { buildBlobPath } from "./buildBlobPath.js";
import { deleteBlob } from "@/services/blobService.js";
import { MissingFilesError } from "../errors.js";

export interface BlobCleanup {
  sourcePaths: string[];
  blobServiceClient: BlobServiceClient;
  containerName: string;
}

/**
 * Phase 3: Deletes source blobs that were copied during Phase 2.
 * Call this AFTER moveFilesBlob (Phase 2) succeeds.
 *
 * @note Failures are logged but not thrown — the copy already succeeded
 * and source blobs in tmp are safe to leave as orphans.
 *
 * @param cleanup - BlobCleanup object returned by moveFilesBlob.
 * @returns {Promise<void>}
 *
 * @see moveFilesBlob for Phase 2.
 */
export async function cleanupSourceBlobs(cleanup: BlobCleanup): Promise<void> {
  await Promise.allSettled(
    cleanup.sourcePaths.map((sourcePath) =>
      deleteBlob(cleanup.blobServiceClient, cleanup.containerName, sourcePath)
    )
  );
}

export interface FileInfo {
  fileId: bigint;
  uuid: string;
  originalName: string;
  currentBlobPath: string;
  finalBlobPath: string;
}

export interface BlobCopyResult {
  sourceCleanup: BlobCleanup;
}

/**
 * Phase 1: Creates SubmissionFile records in the database.
 *
 * @important Must be called inside a Prisma transaction.
 * @note Does NOT perform any blob operations - those happen in Phase 2.
 *
 * @param tx - Prisma transaction client.
 * @param submissionId - The ID of the submission to link files to.
 * @param fileUuids - Array of file UUIDs to link.
 * @param fileType - The type of submission file (defaults to ATTACHMENT).
 *
 * @returns {Promise<FileInfo[]>} File metadata needed for Phase 2 (moveFilesBlob).
 *
 * @throws {MissingFilesError} If any of the provided UUIDs are not found in the database.
 *
 * @see moveFilesBlob for Phase 2 operations.
 * @see cleanupSourceBlobs for post-copy cleanup.
 */
export async function linkFilesToSubmission(
  tx: Prisma.TransactionClient,
  submissionId: bigint,
  fileUuids: string[],
  fileType: SubmissionFileType = SubmissionFileType.ATTACHMENT
): Promise<FileInfo[]> {
  const uniqueUuids = [...new Set(fileUuids)];

  const files = await tx.file.findMany({
    where: { uuid: { in: uniqueUuids } },
    select: { id: true, uuid: true, blobPath: true, originalName: true },
  });

  if (files.length !== uniqueUuids.length) {
    const foundUuids = new Set(files.map((f) => f.uuid));
    const missing = uniqueUuids.filter((u) => !foundUuids.has(u));
    throw new MissingFilesError(missing.join(", "));
  }

  // Calculate final blob paths for each file
  const fileMetadata: FileInfo[] = files.map((file) => ({
    fileId: file.id,
    uuid: file.uuid,
    originalName: file.originalName,
    currentBlobPath: file.blobPath,
    finalBlobPath: buildBlobPath({
      fileType: FileType.SUBMISSION,
      groupKey: submissionId.toString(),
      subPath: fileType,
      uuid: file.uuid,
      name: file.originalName,
    }),
  }));

  // Create SubmissionFile records
  await tx.submissionFile.createMany({
    data: fileMetadata.map((file) => ({
      fileId: file.fileId,
      submissionId,
      type: fileType,
    })),
  });

  return fileMetadata;
}
