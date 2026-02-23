import type { PrismaClient, Prisma } from "@repo/database";
import { RestError, type ContainerClient } from "@azure/storage-blob";
import type { ConfirmUploadResponse } from "@repo/types";
import { FileNotFoundError } from "./errors.js";
import { mapFileToResponse } from "./mappers.js";

interface PersistFileRecordParams {
  uuid: string;
  blobPath: string;
  originalName: string;
  userId: string;
}

export async function persistFileRecord(
  prisma: PrismaClient,
  blobStorage: ContainerClient,
  params: PersistFileRecordParams,
  createLink: (tx: Prisma.TransactionClient, fileId: bigint) => Promise<void>
): Promise<ConfirmUploadResponse> {
  const blobClient = blobStorage.getBlobClient(params.blobPath);

  let sizeBytes: number;
  let mimeType: string;
  try {
    const props = await blobClient.getProperties();
    sizeBytes = props.contentLength!;
    mimeType = props.contentType ?? "application/octet-stream";
  } catch (err) {
    if (err instanceof RestError && err.statusCode === 404) {
      throw new FileNotFoundError(params.uuid);
    }
    throw err;
  }

  const file = await prisma.$transaction(async (tx) => {
    const created = await tx.file.create({
      data: {
        uuid: params.uuid,
        originalName: params.originalName,
        mimeType,
        sizeBytes,
        blobPath: params.blobPath,
        createdById: BigInt(params.userId),
      },
    });
    await createLink(tx, created.id);
    return created;
  });

  return mapFileToResponse(file);
}
