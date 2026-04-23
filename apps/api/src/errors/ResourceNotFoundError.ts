import createError from "@fastify/error";

export const ResourceNotFoundError = createError(
  "RESOURCE_NOT_FOUND",
  "%s with id %s was not found.",
  404
);
