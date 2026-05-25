import type { Accept } from "react-dropzone";
import {
  CANONICAL_MIME_EXTENSIONS,
  FILE_UPLOAD_POLICIES,
  type FileUploadType,
  type FileUploadPolicy,
} from "@repo/constants";

/**
 * Builds the react-dropzone `accept` map for a given upload policy by
 * pairing every allowed MIME type with the matching extension(s).
 * Throws if any extension in the policy lacks a mapping in the shared
 * `CANONICAL_MIME_EXTENSIONS` table — this prevents silent misassignment
 * when a new extension is added to a policy without updating the table.
 */
export const buildAcceptFromPolicy = (policy: FileUploadPolicy): Accept => {
  const accept: Record<string, string[]> = {};
  for (const mime of policy.allowedMimeTypes) {
    accept[mime] = [];
  }
  for (const ext of policy.allowedExtensions) {
    const owner = matchExtensionToMime(ext, policy.allowedMimeTypes);
    accept[owner].push(ext);
  }
  return accept;
};

export const getPolicyAccept = (useCase: FileUploadType): Accept =>
  buildAcceptFromPolicy(FILE_UPLOAD_POLICIES[useCase]);

function matchExtensionToMime(
  extension: string,
  mimeTypes: readonly string[]
): string {
  for (const mime of mimeTypes) {
    if (CANONICAL_MIME_EXTENSIONS[mime]?.includes(extension)) return mime;
  }
  throw new Error(
    `Extension "${extension}" has no MIME mapping in CANONICAL_MIME_EXTENSIONS. ` +
      `Update the canonical map in @repo/constants/files or include the matching MIME in the policy's allowedMimeTypes.`
  );
}
