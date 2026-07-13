import createError from "@fastify/error";

export const ExternalServiceError = createError(
  "EXTERNAL_SERVICE_ERROR",
  "%s",
  503
);
