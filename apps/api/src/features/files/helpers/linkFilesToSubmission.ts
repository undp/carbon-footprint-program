import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { buildBlobPath } from "./buildBlobPath.js";
import { ObjectMoveError, MissingFilesError } from "../errors.js";
import type { StorageAdapter } from "@repo/storage";

/**
 * Deletes the source objects that were copied during linkFilesToSubmission.
 * Call this AFTER linkFilesToSubmission succeeds.
 *
 * @param cleanup - Cleanup context returned by linkFilesToSubmission.
 * @returns {Promise<void>}
 *
 * @see linkFilesToSubmission for the main function.
 */
export async function cleanupSourceObjects(
  cleanup: ObjectCleanupContext
): Promise<void> {
  // we use allSettled to avoid throwing if a deletion fails — the copy already
  // succeeded and source objects in tmp are safe to leave as orphans
  await Promise.allSettled(
    cleanup.sourcePaths.map((sourcePath) =>
      cleanup.storage.deleteObject(sourcePath)
    )
  );
}

export interface ObjectCleanupContext {
  sourcePaths: string[];
  storage: StorageAdapter;
}

export interface ObjectCopyResult {
  sourceCleanup: ObjectCleanupContext;
}

/**
 * Copies the files' objects to their final submission paths and creates
 * SubmissionFile records in the database.
 *
 * Uses a two-phase approach: first copies all objects in parallel via
 * `Promise.allSettled`, then updates the DB only if every copy succeeded.
 * If any copy fails, the successfully copied destinations are deleted
 * before throwing, preventing orphaned objects in permanent storage.
 *
 * @important Must be called inside a Prisma transaction.
 *
 * @param tx - Prisma transaction client.
 * @param submissionId - The ID of the submission to link files to.
 * @param fileUuids - Array of file UUIDs to link.
 * @param storage - Storage adapter.
 * @param fileType - The type of submission file (defaults to SUBMIT_ATTACHMENT).
 *
 * @returns {Promise<ObjectCopyResult>} Cleanup context for deleting source objects after commit.
 *
 * @throws {MissingFilesError} If any of the provided UUIDs are not found in the database.
 * @throws {ObjectMoveError} If any copy fails (after cleaning up successful copies).
 *
 * @see cleanupSourceObjects for post-copy source cleanup.
 */
export async function linkFilesToSubmission(
  tx: Prisma.TransactionClient,
  submissionId: bigint,
  fileUuids: string[],
  storage: StorageAdapter,
  fileType: SubmissionFileType = SubmissionFileType.SUBMIT_ATTACHMENT
): Promise<ObjectCopyResult> {
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

  // Step 1: Compute file plan upfront
  const filesPlans = files.map((file) => ({
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

  // Step 2: Copy all objects in parallel
  const copyResults = await Promise.allSettled(
    filesPlans.map((plan) =>
      storage.copyObject(plan.currentBlobPath, plan.finalBlobPath)
    )
  );

  // Step 3: If any copy failed, clean up successful destinations and throw
  const failedPlans = filesPlans.filter(
    (_, i) => copyResults[i].status === "rejected"
  );

  if (failedPlans.length > 0) {
    const successfulDests = filesPlans
      .filter((_, i) => copyResults[i].status === "fulfilled")
      .map((plan) => plan.finalBlobPath);

    await Promise.allSettled(
      successfulDests.map((dest) => storage.deleteObject(dest))
    );

    throw new ObjectMoveError(
      failedPlans.map((plan) => plan.currentBlobPath).join(", "),
      failedPlans.map((plan) => plan.finalBlobPath).join(", ")
    );
  }

  // Step 4: All copies succeeded — collect source paths for cleanup
  const sourcePaths = filesPlans.map((plan) => plan.currentBlobPath);

  // Step 5: Update DB records
  await Promise.all(
    filesPlans.map((plan) =>
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
      storage,
    },
  };
}
