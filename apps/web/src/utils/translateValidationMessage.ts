import { FILENAME_VALIDATION_MESSAGES } from "@repo/types";

/**
 * Spanish translations for the stable English validation messages
 * declared in `packages/types`. Add an entry here whenever a new
 * shared schema introduces a custom message that may end up shown
 * to the user.
 *
 * Convention:
 * - All Zod schemas in `packages/types` use stable English messages.
 * - This util converts them to user-facing Spanish at render time.
 * - Messages produced in the web app (e.g. React Hook Form `rules`)
 *   should already be in Spanish and will pass through unchanged.
 */
const VALIDATION_MESSAGE_TRANSLATIONS: Record<string, string> = {
  [FILENAME_VALIDATION_MESSAGES.REQUIRED]:
    "El nombre del archivo es obligatorio.",
  [FILENAME_VALIDATION_MESSAGES.TOO_LONG]:
    "El nombre del archivo es demasiado largo.",
  [FILENAME_VALIDATION_MESSAGES.NON_PRINTABLE_ASCII]:
    "El nombre del archivo solo puede contener caracteres ASCII imprimibles.",
  [FILENAME_VALIDATION_MESSAGES.PATH_SEPARATORS]:
    "El nombre del archivo no puede contener separadores de ruta ni dos puntos.",
  [FILENAME_VALIDATION_MESSAGES.ALL_DOTS]:
    "El nombre del archivo no puede estar formado solo por puntos.",
  [FILENAME_VALIDATION_MESSAGES.TRAILING_DOT_OR_SPACE]:
    "El nombre del archivo no puede terminar en punto o espacio.",
};

export const translateValidationMessage = (
  message: string | undefined
): string | undefined => {
  if (message === undefined) return undefined;
  return VALIDATION_MESSAGE_TRANSLATIONS[message] ?? message;
};
