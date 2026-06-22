import type { PresignedUploadResponse } from "@repo/types";

/**
 * Provider-agnostic file upload to a presigned URL.
 *
 * Takes the request-upload response straight from the API: the URL, HTTP
 * method, and headers all come from the storage adapter on the backend (Azure
 * Blob or MinIO/S3), so the frontend never needs to know which provider is
 * active.
 */
export async function uploadFile(
  target: PresignedUploadResponse,
  body: File
): Promise<void> {
  const response = await fetch(target.uploadUrl, {
    method: target.uploadMethod,
    body,
    headers: {
      "Content-Type": body.type || "application/octet-stream",
      ...target.uploadHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(
      `File upload failed (${response.status}): ${await response.text()}`
    );
  }
}
