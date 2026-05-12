import type { PrismaClient } from "@repo/database";
import type { BlobServiceClient } from "@azure/storage-blob";
import { FileStatus } from "@repo/types";
import type { PreviewLineFileResponse } from "@repo/types";
import { FileNotFoundError } from "@/features/files/errors.js";
import { CrossInventoryFileLinkingError } from "../errors.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";
import { generateReadSasUrl } from "@/services/blobService.js";

interface PreviewLineFileInput {
  carbonInventoryId: string;
  uuid: string;
}

export const previewLineFileService = async (
  prisma: PrismaClient,
  blobServiceClient: BlobServiceClient,
  containerName: string,
  input: PreviewLineFileInput
): Promise<PreviewLineFileResponse> => {
  const { carbonInventoryId, uuid } = input;

  const file = await prisma.file.findUnique({
    where: { uuid },
    select: { status: true, blobPath: true, mimeType: true },
  });
  if (!file || file.status !== FileStatus.ACTIVE) {
    throw new FileNotFoundError(uuid);
  }

  const expectedPrefix =
    buildCarbonInventoryLineBlobPathPrefix(carbonInventoryId);
  if (!file.blobPath.startsWith(expectedPrefix)) {
    throw new CrossInventoryFileLinkingError(carbonInventoryId, uuid);
  }

  const { url, expiresAt } = await generateReadSasUrl(
    blobServiceClient,
    containerName,
    file.blobPath,
    { contentType: file.mimeType }
  );

  return { url, expiresAt: expiresAt.toISOString() };
};
