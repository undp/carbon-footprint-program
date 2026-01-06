/**
 * Compares two string values for equality.
 *
 * Note: null and undefined are treated as equivalent values. For example,
 * `stringEquals(null, undefined)` returns true. Callers who need to
 * distinguish between null and undefined must check explicitly before
 * calling this function.
 *
 * @param a - First string value (or null/undefined)
 * @param b - Second string value (or null/undefined)
 * @returns true if both values are equal (including when both are null/undefined)
 *
 * @example
 * stringEquals(null, undefined) // returns true
 * stringEquals(undefined, null) // returns true
 * stringEquals("hello", "hello") // returns true
 */
export function stringEquals(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }
  return a === b;
}
