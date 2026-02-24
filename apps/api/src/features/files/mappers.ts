import type { File as PrismaFile } from "@repo/database";
import type { File as ResponseFile } from "@repo/types";

export const mapFileToResponse = (file: PrismaFile): ResponseFile => ({
  uuid: file.uuid,
  originalName: file.originalName,
  mimeType: file.mimeType,
  sizeBytes: file.sizeBytes,
  status: file.status,
  createdAt: file.createdAt.toISOString(),
  deletedAt: file.deletedAt?.toISOString() ?? null,
});
