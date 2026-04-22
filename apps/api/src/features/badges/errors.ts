import createError from "@fastify/error";

export const BadgeNotFoundError = createError(
  "BADGE_NOT_FOUND",
  "Badge with ID %s not found",
  404
);
