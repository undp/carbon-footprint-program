import { BlobServiceClient } from "@azure/storage-blob";
import { PrismaClient } from "@repo/database";
import { FileInfo } from "./linkFilesToSubmission.js";
import { BlobCopyResult } from "./linkFilesToSubmission.js";
import { BlobMoveError } from "../errors.js";
import { copyBlob } from "@/services/blobService.js";
import { map } from "lodash-es";

/**
 * Phase 2: Copies blobs and updates File.blobPath records.
 * 
 * @important Must be called AFTER the transaction containing Phase 1 (linkFilesToSubmission) commits successfully.
 * @note Performs external blob copy operations and individual database updates outside of the original transaction.
 * 
 * @param blobServiceClient - Azure Blob Storage client.
 * @param containerName - Name of the blob container.
 * @param files - The FileInfo[] array returned by linkFilesToSubmission.
 * @param prisma - Prisma client for updating file paths.
 * 
 * @returns {Promise<BlobCopyResult>} Cleanup info for Phase 3 (cleanupSourceBlobs).
 * 
 * @throws {BlobMoveError} If any blob copy operation fails.
 * 
 * @see linkFilesToSubmission for Phase 1.
 * @see cleanupSourceBlobs for Phase 3 cleanup.
 */
export async function moveFilesBlob(
  blobServiceClient: BlobServiceClient,
  containerName: string,
  files: FileInfo[],
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
