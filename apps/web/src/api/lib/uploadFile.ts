import type { HttpUploadMethod } from "@repo/types";

export interface UploadFileParams {
  url: string;
  method: HttpUploadMethod;
  headers: Record<string, string>;
  body: File;
}

/**
 * Provider-agnostic file upload to a presigned URL.
 *
 * The API returns the URL, HTTP method, and headers that the client must use
 * — those values come from the storage adapter on the backend (Azure Blob or
 * MinIO/S3), so the frontend never needs to know which provider is active.
 */
export async function uploadFile({
  url,
  method,
  headers,
  body,
}: UploadFileParams): Promise<void> {
  const response = await fetch(url, {
    method,
    body,
    headers: {
      "Content-Type": body.type || "application/octet-stream",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `File upload failed (${response.status}): ${await response.text()}`
    );
  }
}
