import createError from "@fastify/error";

export const FileSizeOutOfRangeError = createError(
  "FILE_SIZE_OUT_OF_RANGE",
  "File size %s bytes is outside the allowed range [%s, %s]",
  400
);

export const FileMimeTypeNotAllowedError = createError(
  "FILE_MIME_TYPE_NOT_ALLOWED",
  'MIME type "%s" is not allowed for file type %s. Allowed: %s',
  400
);

export const FileExtensionNotAllowedError = createError(
  "FILE_EXTENSION_NOT_ALLOWED",
  'Extension "%s" is not allowed for file type %s. Allowed: %s',
  400
);
