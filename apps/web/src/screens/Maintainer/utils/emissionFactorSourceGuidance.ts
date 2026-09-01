/**
 * A factor's reporting year lives in its own `year` field, and the capture
 * screen appends it to the displayed label — `DEFRA` plus `2025` renders as
 * `DEFRA (2025)`. Typing the year into the name as well produces
 * `DEFRA 2025 (2025)`, so the maintainer nudges the user away from it.
 *
 * This is data-quality guidance, not a domain rule: a provider whose name really
 * does contain a number is legitimate, so nothing here ever blocks a save.
 */

/** Years a factor could plausibly report on; anything outside is not a vintage. */
const PLAUSIBLE_YEAR_PATTERN = /(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/;

/** True when the name appears to carry a four-digit reporting year. */
export const looksLikeSourceContainsYear = (source: string): boolean =>
  PLAUSIBLE_YEAR_PATTERN.test(source);

/**
 * The year the name appears to carry, or null. Used to phrase the warning with
 * the actual number the user typed rather than a generic hint.
 */
export const extractYearFromSource = (source: string): number | null => {
  const match = PLAUSIBLE_YEAR_PATTERN.exec(source);
  return match ? Number(match[1]) : null;
};

export const SOURCE_YEAR_HELPER_TEXT =
  "Escribe solo el nombre del proveedor o factor. El año se ingresa aparte y se muestra automáticamente entre paréntesis.";

/** The non-blocking warning shown when the name looks like it repeats the year. */
export const buildSourceYearWarning = (source: string): string | null => {
  const detectedYear = extractYearFromSource(source);
  if (detectedYear === null) return null;

  const withoutYear = source
    .replace(String(detectedYear), "")
    .replace(/\s+/g, " ")
    .trim();

  const suggestion = withoutYear.length > 0 ? withoutYear : source;

  return `El nombre parece incluir el año ${detectedYear}. Usa "${suggestion}" e ingresa ${detectedYear} en la columna Año: el factor se mostrará como "${suggestion} (${detectedYear})". Puedes guardar de todas formas.`;
};
