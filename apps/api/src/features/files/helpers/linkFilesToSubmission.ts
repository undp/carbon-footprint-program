import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { buildBlobPath } from "./buildBlobPath.js";
import { copyBlob, deleteBlob } from "@/services/blobService.js";
import { BlobMoveError, MissingFilesError } from "../errors.js";
import { BlobServiceClient } from "@azure/storage-blob";

/**
 * Deletes source blobs that were copied during linkFilesToSubmission.
 * Call this AFTER linkFilesToSubmission succeeds.
 *
 * @param cleanup - BlobCleanup object returned by linkFilesToSubmission.
 * @returns {Promise<void>}
 *
 * @see linkFilesToSubmission for the main function.
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
 * Copies file blobs to their final submission paths and creates SubmissionFile
 * records in the database.
 *
 * Uses a two-phase approach: first copies all blobs in parallel via
 * `Promise.allSettled`, then updates the DB only if every copy succeeded.
 * If any copy fails, successfully copied destination blobs are deleted
 * before throwing, preventing orphaned blobs in permanent storage.
 *
 * @important Must be called inside a Prisma transaction.
 *
 * @param tx - Prisma transaction client.
 * @param submissionId - The ID of the submission to link files to.
 * @param fileUuids - Array of file UUIDs to link.
 * @param blobServiceClient - Azure Blob Service client.
 * @param containerName - Azure Blob container name.
 * @param fileType - The type of submission file (defaults to ATTACHMENT).
 *
 * @returns {Promise<BlobCopyResult>} Cleanup context for deleting source blobs after commit.
 *
 * @throws {MissingFilesError} If any of the provided UUIDs are not found in the database.
 * @throws {BlobMoveError} If any blob copy fails (after cleaning up successful copies).
 *
 * @see cleanupSourceBlobs for post-copy source blob cleanup.
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

<<<<<<< feat/mati/add-centralized-vocab
  // Step 1: Compute file metadata upfront
  const filesMetadata = files.map((file) => ({
=======
  // Step 1: Compute file plan upfront
  const filesPlans = files.map((file) => ({
>>>>>>> main
    file,
    currentBlobPath: file.blobPath,
    finalBlobPath: buildBlobPath({
      fileType: FileType.SUBMISSION,
      groupKey: submissionId.toString(),
      subPath: fileType,
      uuid: file.uuid,
      name: file.originalName,
    }),
  }));

  // Step 2: Copy all blobs in parallel
  const copyResults = await Promise.allSettled(
<<<<<<< feat/mati/add-centralized-vocab
    filesMetadata.map((metadata) =>
      copyBlob(
        blobServiceClient,
        containerName,
        metadata.currentBlobPath,
        metadata.finalBlobPath
=======
    filesPlans.map((plan) =>
      copyBlob(
        blobServiceClient,
        containerName,
        plan.currentBlobPath,
        plan.finalBlobPath
>>>>>>> main
      )
    )
  );

  // Step 3: If any copy failed, clean up successful destinations and throw
<<<<<<< feat/mati/add-centralized-vocab
  const failedPlans = filesMetadata.filter(
=======
  const failedPlans = filesPlans.filter(
>>>>>>> main
    (_, i) => copyResults[i].status === "rejected"
  );

  if (failedPlans.length > 0) {
<<<<<<< feat/mati/add-centralized-vocab
    const successfulDests = filesMetadata
=======
    const successfulDests = filesPlans
>>>>>>> main
      .filter((_, i) => copyResults[i].status === "fulfilled")
      .map((plan) => plan.finalBlobPath);

    await Promise.allSettled(
      successfulDests.map((dest) =>
        deleteBlob(blobServiceClient, containerName, dest)
      )
    );

    throw new BlobMoveError(
      failedPlans.map((plan) => plan.currentBlobPath).join(", "),
      failedPlans.map((plan) => plan.finalBlobPath).join(", ")
    );
  }

<<<<<<< feat/mati/add-centralized-vocab
  // Step 4: All copies succeeded — update DB records
  await Promise.all(
    filesMetadata.map((plan) =>
=======
  // Step 4: All copies succeeded — collect source paths for cleanup
  sourcePaths.push(...filesPlans.map((plan) => plan.currentBlobPath));

  // Step 5: Update DB records
  await Promise.all(
    filesPlans.map((plan) =>
>>>>>>> main
      tx.file.update({
        where: { id: plan.file.id },
        data: { blobPath: plan.finalBlobPath },
      })
    )
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
