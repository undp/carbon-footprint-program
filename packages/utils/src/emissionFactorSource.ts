/**
 * The form two emission factor sources are compared in: trimmed, each
 * whitespace run collapsed to one space, and lower-cased. Two sources with the
 * same key are the same source, so `"defra 2025"` duplicates `"DEFRA 2025"`.
 *
 * The stored form is `EmissionFactorSourceSchema`'s (case kept). This key only
 * decides equality: the single-row duplicate check and the year copy planner
 * both use it, so the maintainer and the copy cannot disagree on what a second
 * source is.
 */
export function emissionFactorSourceKey(source: string): string {
  return source.trim().replace(/\s+/g, " ").toLowerCase();
}
