/**
 * Compares two string values for equality (handles null)
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
