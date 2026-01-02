import createError from "@fastify/error";

export const ApplicationConfigError = createError(
  "APPLICATION_CONFIG_ERROR",
  "Application configuration error: %s",
  500
);
