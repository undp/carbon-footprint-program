import type { StorageAdapter } from "@repo/storage";

/**
 * Seeds a fixture object via the storage adapter's direct `putObject`.
 *
 * Provider-agnostic — works against either Azurite (shared-key auth, no
 * presigned-URL issuance available) or MinIO. Replaces the previous
 * `uploadBlobToAzurite` helper which was Azure-specific.
 */
export async function uploadFixture(
  storage: StorageAdapter,
  blobPath: string,
  {
    content = "test content",
    contentType = "application/octet-stream",
  }: { content?: string; contentType?: string } = {}
): Promise<void> {
  await storage.putObject(blobPath, content, { contentType });
}
