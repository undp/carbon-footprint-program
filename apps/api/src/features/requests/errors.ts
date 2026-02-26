import createError from "@fastify/error";

export const SubmissionNotFoundError = createError(
  "SUBMISSION_NOT_FOUND",
  "Submission with ID %s not found",
  404
);

export const SubmissionNotPendingError = createError(
  "SUBMISSION_NOT_PENDING",
  "Submission with ID %s is not in PENDING status",
  409
);
