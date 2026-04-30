/**
 * Normalizes a description-style text input from a profiling-maintainer request
 * into the value that should be persisted to the database column:
 *
 * - `undefined` → `null` (caller treats `undefined` as no-op for PATCH bodies
 *   and only invokes this helper when it has decided to write the column)
 * - `null` → `null`
 * - empty / whitespace-only string → `null`
 * - otherwise → the trimmed string
 *
 * Trimming defensively here keeps the rule consistent across create/update
 * services even if a request schema is ever changed to drop `.trim()`.
 */
export const normalizeDescriptionInput = (
  value: string | null | undefined
): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};
