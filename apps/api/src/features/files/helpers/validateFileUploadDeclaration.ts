import type { FileUploadLimits } from "./getFileUploadLimits.js";
import {
  FileExtensionNotAllowedError,
  FileMimeTypeNotAllowedError,
  FileTooLargeError,
  FileTooSmallError,
} from "@/errors/index.js";

interface FileUploadDeclaration {
  fileType: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

export function extractFileExtension(originalName: string): string {
  const dotIndex = originalName.lastIndexOf(".");
  if (dotIndex <= 0 || dotIndex === originalName.length - 1) return "";
  return originalName.slice(dotIndex).toLowerCase();
}

/**
 * Validates the size, MIME type, and filename extension declared by a
 * client against the effective limits resolved for the file's use case.
 * Throws the matching domain error so the Fastify error handler maps it
 * to a 400 response with a stable code.
 */
export function validateFileUploadDeclaration(
  declaration: FileUploadDeclaration,
  limits: FileUploadLimits
): void {
  const { fileType, originalName, sizeBytes, mimeType } = declaration;

  if (sizeBytes < limits.minBytes) {
    throw new FileTooSmallError(String(sizeBytes), String(limits.minBytes));
  }
  if (sizeBytes > limits.maxBytes) {
    throw new FileTooLargeError(String(sizeBytes), String(limits.maxBytes));
  }

  const normalizedMime = mimeType.toLowerCase();
  if (!limits.allowedMimeTypes.includes(normalizedMime)) {
    throw new FileMimeTypeNotAllowedError(
      mimeType,
      fileType,
      limits.allowedMimeTypes.join(", ")
    );
  }

  const extension = extractFileExtension(originalName);
  if (!limits.allowedExtensions.includes(extension)) {
    throw new FileExtensionNotAllowedError(
      extension || "(none)",
      fileType,
      limits.allowedExtensions.join(", ")
    );
  }
}
