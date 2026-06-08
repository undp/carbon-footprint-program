/**
 * Normalizes a string so it can be safely embedded in a filename. Strips
 * Unicode diacritics (combining marks U+0300..U+036F), replaces any
 * non-alphanumeric character with `-`, collapses repeated dashes, trims
 * leading/trailing dashes, and falls back to `fallback` when the result
 * is empty.
 *
 * Locale-agnostic by design — the platform is deployed per country but
 * filenames need to round-trip across operating systems.
 */
export function sanitizeForFilename(
  name: string,
  fallback = "untitled"
): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}
