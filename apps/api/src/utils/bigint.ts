/**
 * Helper to map optional string ID fields to BigInt or null.
 * - Returns undefined if value is undefined (field not provided)
 * - Returns null if value is null or empty string
 * - Returns BigInt(value) otherwise
 */
export const mapBigIntField = (
  value: string | null | undefined
): bigint | null | undefined => {
  if (value === undefined) return undefined;

  if (value === null || value === "") return null;

  return BigInt(value);
};

/**
 * Compares two BigInt values for equality
 */
export function bigIntEquals(
  a: bigint | null | undefined,
  b: bigint | null | undefined
): boolean {
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }
  return a === b;
}
