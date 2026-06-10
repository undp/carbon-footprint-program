import { z } from "zod";

export const FILENAME_MAX_LENGTH = 255;

/**
 * Characters and patterns unsafe across the file systems and object
 * stores the platform may be deployed against: control characters,
 * path separators, Windows-reserved characters, and leading/trailing
 * dots or spaces. Any Unicode-printable name (Spanish accents, ñ, ç,
 * etc.) is accepted otherwise.
 */
const UNSAFE_FILENAME_PATTERN = /[\p{Cc}/\\:<>"|?*]|^[.\s]|[.\s]$/u;

export const FilenameSchema = z
  .string()
  .trim()
  .min(1, "El nombre del archivo es obligatorio")
  .max(
    FILENAME_MAX_LENGTH,
    `El nombre del archivo no puede superar los ${FILENAME_MAX_LENGTH} caracteres`
  )
  .refine(
    (name) => !UNSAFE_FILENAME_PATTERN.test(name),
    "El nombre del archivo contiene caracteres no permitidos"
  );
