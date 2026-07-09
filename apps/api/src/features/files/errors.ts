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

export const ObjectMoveError = createError(
  "OBJECT_MOVE_ERROR",
  "Failed to move objects from %s to %s",
  500
);

export const MissingFilesError = createError(
  "MISSING_FILES",
  "File UUIDs not found: %s",
  404
);
