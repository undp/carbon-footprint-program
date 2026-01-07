/**
 * Helper to map optional string ID fields to BigInt or null.
 * - Returns undefined if value is undefined (field not provided)
 * - Returns null if value is null or empty string
 * - Returns BigInt(value) otherwise
 */
export function mapBigIntField(value: string): bigint;
export function mapBigIntField(value: null): null;
export function mapBigIntField(value: undefined): undefined;
export function mapBigIntField(value: string | null): bigint | null;
export function mapBigIntField(value: string | undefined): bigint | undefined;
export function mapBigIntField(
  value: string | null | undefined
): bigint | null | undefined;
export function mapBigIntField(
  value: string | null | undefined
): bigint | null | undefined {
  if (value === null || value === undefined) return value;
  return BigInt(value);
}

/**
 * Compares two BigInt values for equality.
 *
 * Note: null and undefined are treated as equivalent values. For example,
 * `bigIntEquals(null, undefined)` returns true. Callers who need to
 * distinguish between null and undefined must check explicitly before
 * calling this function.
 *
 * @param a - First BigInt value (or null/undefined)
 * @param b - Second BigInt value (or null/undefined)
 * @returns true if both values are equal (including when both are null/undefined)
 *
 * @example
 * bigIntEquals(null, undefined) // returns true
 * bigIntEquals(undefined, null) // returns true
 * bigIntEquals(BigInt(5), BigInt(5)) // returns true
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
