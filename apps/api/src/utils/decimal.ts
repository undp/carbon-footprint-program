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
 * Compares two Decimal values for equality
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
