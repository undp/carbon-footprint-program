import type { File as PrismaFile } from "@repo/database";
import type { GetBadgeFilesResponse } from "@repo/types";

export const mapFileToResponse = (
  file: PrismaFile
): GetBadgeFilesResponse[number] => ({
  uuid: file.uuid,
  originalName: file.originalName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  status: file.status,
  createdAt: file.createdAt.toISOString(),
  deletedAt: file.deletedAt?.toISOString() ?? null,
});
