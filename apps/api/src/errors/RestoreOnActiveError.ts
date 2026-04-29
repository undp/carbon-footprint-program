import createError from "@fastify/error";

export const RestoreOnActiveError = createError(
  "RESTORE_ON_ACTIVE",
  "Cannot restore: the row is already ACTIVE",
  400
);
