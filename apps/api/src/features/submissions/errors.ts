import createError from "@fastify/error";

export const SubmissionForbiddenError = createError(
  "SUBMISSION_FORBIDDEN",
  "You do not have access to submission %s",
  403
);
