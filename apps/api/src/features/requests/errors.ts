import createError from "@fastify/error";

export const SubmissionUpdateError = createError(
  "SUBMISSION_UPDATE_ERROR",
  "Failed to update submission with ID %s, status is not PENDING or submission not found",
  400
);

export const InvalidSubmissionFileGroupsError = createError(
  "INVALID_SUBMISSION_FILE_GROUPS",
  "No submission file groups were provided for attachment",
  400
);
