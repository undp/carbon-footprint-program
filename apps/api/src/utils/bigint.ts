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
