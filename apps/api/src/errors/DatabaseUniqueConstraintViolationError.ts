import createError from "@fastify/error";

export const DatabaseUniqueConstraintViolationError = createError(
  "DATABASE_UNIQUE_CONSTRAINT_VIOLATION",
  "A unique constraint violation occurred",
  409
);
