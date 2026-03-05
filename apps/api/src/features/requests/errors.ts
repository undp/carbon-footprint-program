import createError from "@fastify/error";

export const SubmissionUpdateError = createError(
  "SUBMISSION_UPDATE_ERROR",
  "Failed to update submission with ID %s, status is not PENDING or submission not found",
  400
);
