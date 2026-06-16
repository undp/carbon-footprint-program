import type { PresignedUploadResponse } from "@repo/types";
import type { StorageAdapter } from "@repo/storage";

/**
 * Issues a presigned write URL for `blobPath` and shapes it into the response
 * shared by every request-upload endpoint (`PresignedUploadResponseSchema`).
 */
export async function buildPresignedUploadResponse(
  storage: StorageAdapter,
  blobPath: string,
  fileUuid: string
): Promise<PresignedUploadResponse> {
  const { url, method, headers, expiresAt } =
    await storage.generateWriteUrl(blobPath);

  return {
    uuid: fileUuid,
    uploadUrl: url,
    uploadMethod: method,
    uploadHeaders: headers,
    expiresAt: expiresAt.toISOString(),
  };
}
