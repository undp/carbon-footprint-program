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
  CONTROL_CHARACTERS: "File name must not contain control characters",
  RESERVED_CHARACTERS:
    "File name must not contain path separators, colons, or reserved characters",
  ALL_DOTS: "File name must not consist only of dots",
  LEADING_DOT_OR_SPACE: "File name must not start with a dot or space",
  TRAILING_DOT_OR_SPACE: "File name must not end with a dot or space",
} as const;

/**
 * Permissive filename schema: accepts any Unicode-printable name
 * (Spanish accents, ñ, ç, etc.) while blocking the characters and
 * patterns that are unsafe across the file systems and object stores
 * the platform may be deployed against (path traversal separators,
 * Windows-reserved characters, control characters, leading/trailing
 * dots or spaces).
 */
export const FilenameSchema = z
  .string()
  .trim()
  .min(1, FILENAME_VALIDATION_MESSAGES.REQUIRED)
  .max(FILENAME_MAX_LENGTH, FILENAME_VALIDATION_MESSAGES.TOO_LONG)
  .refine(
    (name) => !/\p{Cc}/u.test(name),
    FILENAME_VALIDATION_MESSAGES.CONTROL_CHARACTERS
  )
  .refine(
    (name) => !/[/\\:<>"|?*]/.test(name),
    FILENAME_VALIDATION_MESSAGES.RESERVED_CHARACTERS
  )
  .refine((name) => !/^\.+$/.test(name), FILENAME_VALIDATION_MESSAGES.ALL_DOTS)
  .refine(
    (name) => !/^[.\s]/.test(name),
    FILENAME_VALIDATION_MESSAGES.LEADING_DOT_OR_SPACE
  )
  .refine(
    (name) => !/[.\s]$/.test(name),
    FILENAME_VALIDATION_MESSAGES.TRAILING_DOT_OR_SPACE
  );
