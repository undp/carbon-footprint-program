import createError from "@fastify/error";

export const LineFileUploadValidationError = createError(
  "LINE_FILE_UPLOAD_VALIDATION_ERROR",
  "Carbon inventory line file upload rejected: %s",
  422
);
