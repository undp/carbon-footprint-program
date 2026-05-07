import createError from "@fastify/error";

export const LegalUploadValidationError = createError(
  "LEGAL_UPLOAD_VALIDATION_ERROR",
  "Legal document upload rejected: %s",
  400
);
