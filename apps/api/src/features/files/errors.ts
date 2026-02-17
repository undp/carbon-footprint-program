import createError from "@fastify/error";

export const FileNotFoundError = createError(
  "FILE_NOT_FOUND",
  "File with UUID %s not found",
  404
);

export const FileTypeNotFoundError = createError(
  "FILE_TYPE_NOT_FOUND",
  "%s with ID %s not found",
  404
);

export const StorageNotConfiguredError = createError(
  "STORAGE_NOT_CONFIGURED",
  "Blob storage is not configured. Set AZURE_STORAGE_ACCOUNT_NAME to enable file uploads.",
  503
);

export const FileUploadFailedError = createError(
  "FILE_UPLOAD_FAILED",
  "Failed to upload file: %s",
  500
);
