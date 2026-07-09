import type { ReadUrlSigner } from "@repo/storage";
import type { SubmissionHistoryFileRow } from "../features/submissions/helpers.js";

/**
 * Maps an array of file rows to their response shape with signed preview URLs.
 */
export async function mapFilesWithUrls(
  files: SubmissionHistoryFileRow[],
  signReadUrl: ReadUrlSigner
) {
  if (files.length === 0) return [];

  return Promise.all(
    files.map(async (file) => {
      const { url, expiresAt } = await signReadUrl(file.blobPath, {
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
