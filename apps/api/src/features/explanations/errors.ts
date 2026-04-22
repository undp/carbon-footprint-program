import createError from "@fastify/error";

export const ExplanationNotFoundError = createError(
  "EXPLANATION_NOT_FOUND",
  "Explanation with slug %s not found",
  404
);
