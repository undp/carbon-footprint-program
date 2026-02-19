import type { File as PrismaFile } from "@repo/database";
import type { File as ResponseFile } from "@repo/types";

export function mapFileToResponse(file: PrismaFile): ResponseFile {
  return {
    uuid: file.uuid,
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    status: file.status,
    createdAt: file.createdAt.toISOString(),
    deletedAt: file.deletedAt?.toISOString() ?? null,
  };
}
