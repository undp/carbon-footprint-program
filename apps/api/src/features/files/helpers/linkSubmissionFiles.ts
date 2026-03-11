import type { BlobServiceClient } from "@azure/storage-blob";
import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { map } from "lodash-es";
import { buildBlobPath } from "./buildBlobPath.js";
import { copyBlob, deleteBlob } from "@/services/blobService.js";
import { BlobMoveError } from "../errors.js";

export interface BlobCleanup {
  sourcePaths: string[];
  blobServiceClient: BlobServiceClient;
  containerName: string;
}

/**
 * Deletes source blobs that were copied during the transaction.
 * Call this AFTER the transaction commits successfully.
 * Failures are logged but not thrown — the copy already succeeded
 * and source blobs in tmp are safe to leave as orphans.
 */
export async function cleanupSourceBlobs(cleanup: BlobCleanup): Promise<void> {
  await Promise.allSettled(
    cleanup.sourcePaths.map((sourcePath) =>
      deleteBlob(cleanup.blobServiceClient, cleanup.containerName, sourcePath)
    )
  );
}

/**
 * Links pre-uploaded (tmp) files to a submission:
 * 1. Copies each blob from its tmp path to `SUBMISSION/:submissionId/:fileType/uuid-name`
 * 2. Updates `File.blobPath` in the DB
 * 3. Creates `SubmissionFile` records
 *
 * Must be called inside a Prisma transaction (`tx`).
 * Returns a `BlobCleanup` (if blobs were copied) so the caller can delete
 * source blobs **after** the transaction commits.
 */
export async function linkSubmissionFiles(
  tx: Prisma.TransactionClient,
  blobServiceClient: BlobServiceClient | undefined,
  containerName: string | undefined,
  submissionId: bigint,
  fileUuids: string[],
  fileType: SubmissionFileType = SubmissionFileType.ATTACHMENT
): Promise<BlobCleanup | undefined> {
  const uniqueUuids = [...new Set(fileUuids)];

  const files = await tx.file.findMany({
    where: { uuid: { in: uniqueUuids } },
    select: { id: true, uuid: true, blobPath: true, originalName: true },
  });

  if (files.length !== uniqueUuids.length) {
    const foundUuids = new Set(files.map((f) => f.uuid));
    const missing = uniqueUuids.filter((u) => !foundUuids.has(u));
    throw new Error(
      `Cannot link submission files: file UUIDs not found: ${missing.join(", ")}`
    );
  }

  let blobCleanup: BlobCleanup | undefined;

  if (blobServiceClient && containerName) {
    const sourcePaths: string[] = [];

    await Promise.all(
      map(files, async (file) => {
        const finalPath = buildBlobPath({
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
            finalPath
          );
        } catch {
          throw new BlobMoveError(file.blobPath, finalPath);
        }
        sourcePaths.push(file.blobPath);
        await tx.file.update({
          where: { id: file.id },
          data: { blobPath: finalPath },
        });
      })
    );

    blobCleanup = { sourcePaths, blobServiceClient, containerName };
  }

  await tx.submissionFile.createMany({
    data: files.map((file) => ({
      fileId: file.id,
      submissionId,
      type: fileType,
    })),
  });

  return blobCleanup;
}
