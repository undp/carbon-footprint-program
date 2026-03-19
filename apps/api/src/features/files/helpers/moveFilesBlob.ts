import { BlobServiceClient } from "@azure/storage-blob";
import { PrismaClient } from "@repo/database";
import { FileInfo } from "./linkFilesToSubmission.js";
import { BlobCopyResult } from "./linkFilesToSubmission.js";
import { BlobMoveError } from "../errors.js";
import { copyBlob } from "@/services/blobService.js";
import { map } from "lodash-es";

/**
 * Phase 2: Copies blobs and updates File.blobPath records.
 * Must be called AFTER the transaction commits successfully.
 * Performs external blob copy operations and database updates outside of the transaction.
 *
 * Returns cleanup info for source blobs that should be deleted.
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
