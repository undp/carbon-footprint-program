import { Prisma } from "@repo/database";

/**
 * Helper to map optional number fields to Prisma.Decimal or null.
 * - Returns undefined if value is undefined (field not provided)
 * - Returns null if value is null
 * - Returns Prisma.Decimal(value) otherwise
 */
export function mapDecimalField(value: number): Prisma.Decimal;
export function mapDecimalField(value: null): null;
export function mapDecimalField(value: undefined): undefined;
export function mapDecimalField(
  value: number | null | undefined
): Prisma.Decimal | null | undefined;
export function mapDecimalField(
  value: number | null | undefined
): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;

  if (value === null) return null;

  return new Prisma.Decimal(value);
}

/**
 * Compares two Decimal values for equality.
 *
 * Note: null and undefined are treated as equivalent values. For example,
 * `decimalEquals(null, undefined)` returns true. Callers who need to
 * distinguish between null and undefined must check explicitly before
 * calling this function.
 *
 * @param a - First Decimal value (or null/undefined)
 * @param b - Second Decimal value (or null/undefined)
 * @returns true if both values are equal (including when both are null/undefined)
 *
 * @example
 * decimalEquals(null, undefined) // returns true
 * decimalEquals(undefined, null) // returns true
 * decimalEquals(new Prisma.Decimal(5), new Prisma.Decimal(5)) // returns true
 */
export function decimalEquals(
  a: Prisma.Decimal | null | undefined,
  b: Prisma.Decimal | null | undefined
): boolean {
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }
  return a.equals(b);
}
