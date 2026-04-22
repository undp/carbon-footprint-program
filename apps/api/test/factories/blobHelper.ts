import type { ContainerClient } from "@azure/storage-blob";

/**
 * Uploads a fake blob to Azurite for integration tests.
 *
 * @param blobStorage  The container client (typically `app.blobStorage!`).
 * @param blobPath     The full blob path (e.g. `BADGE/CARBON_INVENTORY/uuid-name.png`).
 * @param options.content      Content to upload (string or Buffer). Defaults to `"test content"`.
 * @param options.contentType  MIME type for the blob (defaults to `"application/octet-stream"`).
 */
export async function uploadBlobToAzurite(
  blobStorage: ContainerClient,
  blobPath: string,
  {
    content = "test content",
    contentType = "application/octet-stream",
  }: { content?: string | Buffer; contentType?: string } = {}
): Promise<void> {
  const buffer =
    typeof content === "string" ? Buffer.from(content) : content;
  await blobStorage
    .getBlockBlobClient(blobPath)
    .upload(buffer, buffer.byteLength, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
}
