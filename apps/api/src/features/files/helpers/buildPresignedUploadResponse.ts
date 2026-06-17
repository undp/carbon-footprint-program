import { HttpUploadMethod, type PresignedUploadResponse } from "@repo/types";
import type { StorageAdapter, UploadHttpMethod } from "@repo/storage";

/**
 * Maps the storage layer's backend-agnostic upload method to the API wire enum,
 * keeping `@repo/storage` free of any dependency on the contract package. The
 * `Record` is exhaustive over `UploadHttpMethod`, so adding a new storage method
 * forces a matching DTO decision here at compile time.
 */
const UPLOAD_METHOD_TO_DTO: Record<UploadHttpMethod, HttpUploadMethod> = {
  PUT: HttpUploadMethod.PUT,
};

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
    uploadMethod: UPLOAD_METHOD_TO_DTO[method],
    uploadHeaders: headers,
    expiresAt: expiresAt.toISOString(),
  };
}
