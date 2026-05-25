import { z } from "zod";

export const FILENAME_MAX_LENGTH = 255;

/**
 * Stable English messages used by FilenameSchema. The web client maps
 * them to Spanish through `translateValidationMessage`. Keep the
 * strings exported so the FE dictionary can reference them by symbol
 * and stay in sync at build time.
 */
export const FILENAME_VALIDATION_MESSAGES = {
  REQUIRED: "File name is required",
  TOO_LONG: `File name must be at most ${FILENAME_MAX_LENGTH} characters`,
  NON_PRINTABLE_ASCII: "File name must only contain printable ASCII characters",
  PATH_SEPARATORS: "File name must not contain path separators or colons",
  ALL_DOTS: "File name must not consist only of dots",
  TRAILING_DOT_OR_SPACE: "File name must not end with a dot or space",
} as const;

export const FilenameSchema = z
  .string()
  .trim()
  .min(1, FILENAME_VALIDATION_MESSAGES.REQUIRED)
  .max(FILENAME_MAX_LENGTH, FILENAME_VALIDATION_MESSAGES.TOO_LONG)
  .regex(/^[ -~]+$/, FILENAME_VALIDATION_MESSAGES.NON_PRINTABLE_ASCII)
  .refine(
    (name) => !/[/\\:]/.test(name),
    FILENAME_VALIDATION_MESSAGES.PATH_SEPARATORS
  )
  .refine((name) => !/^\.+$/.test(name), FILENAME_VALIDATION_MESSAGES.ALL_DOTS)
  .refine(
    (name) => !/[.\s]$/.test(name),
    FILENAME_VALIDATION_MESSAGES.TRAILING_DOT_OR_SPACE
  );
