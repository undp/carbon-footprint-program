import type { ContainerClient } from "@azure/storage-blob";

/**
 * Uploads a fake blob to Azurite for integration tests.
 *
 * @param blobStorage  The container client (typically `app.blobStorage!`).
 * @param blobPath     The full blob path (e.g. `BADGE/CARBON_INVENTORY/uuid-name.png`).
 * @param options.content      Text content to upload (defaults to `"test content"`).
 * @param options.contentType  MIME type for the blob (defaults to `"application/octet-stream"`).
 */
export async function uploadBlobToAzurite(
  blobStorage: ContainerClient,
  blobPath: string,
  {
    content = "test content",
    contentType = "application/octet-stream",
  }: { content?: string; contentType?: string } = {}
): Promise<void> {
  await blobStorage
    .getBlockBlobClient(blobPath)
    .upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: contentType },
    });
}
