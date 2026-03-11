import type { BlobServiceClient } from "@azure/storage-blob";
import { Prisma, SubmissionFileType } from "@repo/database";
import { FileType } from "@repo/types";
import { map } from "lodash-es";
import { buildBlobPath } from "./buildBlobPath.js";
import { moveBlob } from "@/services/blobService.js";
import { BlobMoveError } from "../errors.js";

/**
 * Links pre-uploaded (tmp) files to a submission:
 * 1. Moves each blob from its tmp path to `SUBMISSION/:submissionId/:fileType/uuid-name`
 * 2. Updates `File.blobPath` in the DB
 * 3. Creates `SubmissionFile` records
 *
 * Must be called inside a Prisma transaction (`tx`).
 */
export async function linkSubmissionFiles(
  tx: Prisma.TransactionClient,
  blobServiceClient: BlobServiceClient | undefined,
  containerName: string | undefined,
  submissionId: bigint,
  fileUuids: string[],
  fileType: SubmissionFileType = SubmissionFileType.ATTACHMENT
): Promise<void> {
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

  if (blobServiceClient && containerName) {
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
          await moveBlob(
            blobServiceClient,
            containerName,
            file.blobPath,
            finalPath
          );
        } catch {
          throw new BlobMoveError(file.blobPath, finalPath);
        }
        await tx.file.update({
          where: { id: file.id },
          data: { blobPath: finalPath },
        });
      })
    );
  }

  await tx.submissionFile.createMany({
    data: files.map((file) => ({
      fileId: file.id,
      submissionId,
      type: fileType,
    })),
  });
}
