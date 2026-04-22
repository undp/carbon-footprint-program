import createError from "@fastify/error";

export const BadgeUploadValidationError = createError(
  "BADGE_UPLOAD_VALIDATION_ERROR",
  "%s",
  400
);
