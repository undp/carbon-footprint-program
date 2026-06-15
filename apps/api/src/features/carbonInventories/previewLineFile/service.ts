import type { PrismaClient } from "@repo/database";
import { FileStatus } from "@repo/types";
import type { PreviewLineFileResponse } from "@repo/types";
import { FileNotFoundError } from "@/features/files/errors.js";
import { CrossInventoryFileLinkingError } from "../errors.js";
import { buildCarbonInventoryLineBlobPathPrefix } from "../helpers.js";
import { buildContentDisposition } from "@/utils/contentDisposition.js";
import type { StorageAdapter } from "@/services/storage/index.js";

interface PreviewLineFileInput {
  carbonInventoryId: string;
  uuid: string;
}

export const previewLineFileService = async (
  prisma: PrismaClient,
  storage: StorageAdapter,
  input: PreviewLineFileInput
): Promise<PreviewLineFileResponse> => {
  const { carbonInventoryId, uuid } = input;

  const file = await prisma.file.findUnique({
    where: { uuid },
    select: {
      status: true,
      blobPath: true,
      mimeType: true,
      originalName: true,
    },
  });
  if (!file || file.status !== FileStatus.ACTIVE) {
    throw new FileNotFoundError(uuid);
  }

  const expectedPrefix =
    buildCarbonInventoryLineBlobPathPrefix(carbonInventoryId);
  if (!file.blobPath.startsWith(expectedPrefix)) {
    throw new CrossInventoryFileLinkingError(carbonInventoryId, uuid);
  }

  const { url, expiresAt } = await storage.generateReadUrl(file.blobPath, {
    contentType: file.mimeType,
    contentDisposition: buildContentDisposition("inline", file.originalName),
  });

  return { url, expiresAt: expiresAt.toISOString() };
};
