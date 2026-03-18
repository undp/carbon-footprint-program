import type { BlobServiceClient } from "@azure/storage-blob";
import { Prisma, SubmissionFileType, type PrismaClient } from "@repo/database";
import { FileType } from "@repo/types";
import { map } from "lodash-es";
import { buildBlobPath } from "./buildBlobPath.js";
import { copyBlob, deleteBlob } from "@/services/blobService.js";
import {
  BlobMoveError,
  FileNotFoundError,
  MissingFilesError,
} from "../errors.js";

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

export interface SubmissionFileInfo {
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
 * Must be called inside a Prisma transaction.
 * Does NOT perform any blob operations - those happen in Phase 2.
 *
 * Returns file metadata needed for blob copying after the transaction commits.
 */
export async function createSubmissionFileRecords(
  tx: Prisma.TransactionClient,
  submissionId: bigint,
  fileUuids: string[],
  fileType: SubmissionFileType = SubmissionFileType.ATTACHMENT
): Promise<SubmissionFileInfo[]> {
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
  const fileMetadata: SubmissionFileInfo[] = files.map((file) => ({
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

/**
 * Phase 2: Copies blobs and updates File.blobPath records.
 * Must be called AFTER the transaction commits successfully.
 * Performs external blob copy operations and database updates outside of the transaction.
 *
 * Returns cleanup info for source blobs that should be deleted.
 */
export async function moveSubmissionBlobs(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  files: SubmissionFileInfo[],
  prisma: PrismaClient
): Promise<BlobCopyResult> {
  const sourcePaths: string[] = [];

  await Promise.all(
    map(files, async (file) => {
      try {
        await copyBlob(
          blobServiceClient,
          containerName,
          file.currentBlobPath,
          file.finalBlobPath
        );
      } catch {
        throw new BlobMoveError(file.currentBlobPath, file.finalBlobPath);
      }
      sourcePaths.push(file.currentBlobPath);

      // Update File.blobPath outside of transaction
      await prisma.file.update({
        where: { id: file.fileId },
        data: { blobPath: file.finalBlobPath },
      });
    })
  );

  return {
    sourceCleanup: {
      sourcePaths,
      blobServiceClient,
      containerName,
    },
  };
}
