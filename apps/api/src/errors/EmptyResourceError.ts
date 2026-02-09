import createError from "@fastify/error";

export const EmptyResourceError = createError(
  "RESOURCE_IS_EMPTY",
  "%s is empty at database level. It must have entries before it can be used.",
  404
);
