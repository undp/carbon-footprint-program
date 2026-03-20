import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { buildBlobPath } from "./buildBlobPath.js";
import { copyBlob, deleteBlob } from "@/services/blobService.js";
import { BlobMoveError, MissingFilesError } from "../errors.js";
import { map } from "lodash-es";
import { BlobServiceClient } from "@azure/storage-blob";

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
export async function cleanupSourceBlobs(
  cleanup: BlobCleanupContext
): Promise<void> {
  // we use allSettled to avoid throwing errors if a blob deletion fails
  // since the copy already succeeded and source blobs in tmp are safe to leave as orphans
  await Promise.allSettled(
    cleanup.sourcePaths.map((sourcePath) =>
      deleteBlob(cleanup.blobServiceClient, cleanup.containerName, sourcePath)
    )
  );
}

export interface BlobCleanupContext {
  sourcePaths: string[];
  blobServiceClient: BlobServiceClient;
  containerName: string;
}

export interface BlobCopyResult {
  sourceCleanup: BlobCleanupContext;
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
  blobServiceClient: BlobServiceClient,
  containerName: string,
  fileType: SubmissionFileType = SubmissionFileType.ATTACHMENT
): Promise<BlobCopyResult> {
  const uniqueUuids = [...new Set(fileUuids)];
  const sourcePaths: string[] = [];

  const files = await tx.file.findMany({
    where: { uuid: { in: uniqueUuids } },
    select: { id: true, uuid: true, blobPath: true, originalName: true },
  });

  if (files.length !== uniqueUuids.length) {
    const foundUuids = new Set(files.map((f) => f.uuid));
    const missing = uniqueUuids.filter((u) => !foundUuids.has(u));
    throw new MissingFilesError(missing.join(", "));
  }

  await Promise.all(
    map(files, async (file) => {
      const currentBlobPath = file.blobPath;
      const finalBlobPath = buildBlobPath({
        fileType: FileType.SUBMISSION,
        groupKey: submissionId.toString(),
        subPath: fileType,
        uuid: file.uuid,
        name: file.originalName,
      });
      try {
        await copyBlob(
          blobServiceClient,
          containerName,
          file.blobPath,
          finalBlobPath
        );
        await tx.file.update({
          where: { id: file.id },
          data: { blobPath: finalBlobPath },
        });
      } catch {
        throw new BlobMoveError(currentBlobPath, finalBlobPath);
      }
      sourcePaths.push(currentBlobPath);
    })
  );

  // Create SubmissionFile records
  await tx.submissionFile.createMany({
    data: files.map((file) => ({
      fileId: file.id,
      submissionId,
      type: fileType,
    })),
  });

  return {
    sourceCleanup: {
      sourcePaths,
      blobServiceClient,
      containerName,
    },
  };
}
