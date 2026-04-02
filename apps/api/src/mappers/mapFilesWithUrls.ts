import type { ReadSasUrlSigner } from "@/services/blobService.js";

type FileRow = {
  uuid: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  blobPath: string;
  createdAt: Date;
};

/**
 * Maps an array of file rows to their response shape with signed preview URLs.
 */
export async function mapFilesWithUrls(
  files: FileRow[],
  signReadSasUrl: ReadSasUrlSigner
) {
  if (files.length === 0) return [];

  return Promise.all(
    files.map(async (file) => {
      const { url, expiresAt } = await signReadSasUrl(file.blobPath, {
        contentType: file.mimeType,
      });
      return {
        uuid: file.uuid,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt.toISOString(),
        previewUrl: url,
        previewUrlExpiresAt: expiresAt.toISOString(),
      };
    })
  );
}
