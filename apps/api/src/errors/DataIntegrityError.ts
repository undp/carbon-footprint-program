import createError from "@fastify/error";

export const DataIntegrityError = createError(
  "DATA_INTEGRITY_ERROR",
  "Data integrity error: %s",
  500
);
