import createError from "@fastify/error";

export const FileNotFoundError = createError(
  "FILE_NOT_FOUND",
  "File with UUID %s not found",
  404
);

export const SubmissionNotFoundError = createError(
  "SUBMISSION_NOT_FOUND",
  "Submission with ID %s not found",
  404
);

export const StorageNotConfiguredError = createError(
  "STORAGE_NOT_CONFIGURED",
  "Blob storage is not configured. Set AZURE_STORAGE_ACCOUNT_NAME to enable file uploads.",
  503
);

export const BlobMoveError = createError(
  "BLOB_MOVE_ERROR",
  "Failed to move blobs: %s",
  500
);

export const MissingFilesError = createError(
  "MISSING_FILES",
  "File UUIDs not found: %s",
  404
);
