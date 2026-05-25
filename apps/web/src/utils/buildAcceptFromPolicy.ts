import type { Accept } from "react-dropzone";
import {
  FILE_UPLOAD_POLICIES,
  type FileUploadType,
  type FileUploadPolicy,
} from "@repo/constants";

/**
 * Builds the react-dropzone `accept` map for a given upload policy by
 * pairing every allowed MIME type with the matching extension(s).
 * Throws if any extension in the policy lacks a mapping in the
 * candidates table below — this prevents silent misassignment when a
 * new extension is added to a policy without updating this util.
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
  const candidates: Record<string, readonly string[]> = {
    "image/png": [".png"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/webp": [".webp"],
    "image/svg+xml": [".svg"],
    "image/gif": [".gif"],
    "application/pdf": [".pdf"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      ".xlsx",
    ],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "text/csv": [".csv"],
    "text/plain": [".txt"],
    "application/zip": [".zip"],
    "application/x-zip-compressed": [".zip"],
  };
  for (const mime of mimeTypes) {
    if (candidates[mime]?.includes(extension)) return mime;
  }
  throw new Error(
    `Extension "${extension}" has no MIME mapping in buildAcceptFromPolicy. ` +
      `Update the candidates table or include the matching MIME in the policy's allowedMimeTypes.`
  );
}
