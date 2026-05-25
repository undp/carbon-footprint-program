import createError from "@fastify/error";

export const FileTooSmallError = createError(
  "FILE_TOO_SMALL",
  "File size %s bytes is below the minimum allowed size of %s",
  400
);

export const FileTooLargeError = createError(
  "FILE_TOO_LARGE",
  "File size %s bytes exceeds the maximum allowed size of %s",
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
