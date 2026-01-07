import { Prisma } from "@repo/database";

/**
 * Converts a value to a number, preserving null and undefined values.
 *
 * @param value - The value to convert (Prisma.Decimal, null, or undefined)
 * @returns Returns:
 *   - `number` when the input is a Prisma.Decimal (or any non-null, non-undefined value)
 *   - `null` when the input is `null`
 *   - `undefined` when the input is `undefined`
 */
export function toNumberOrNull(value: Prisma.Decimal): number;
export function toNumberOrNull(value: null): null;
export function toNumberOrNull(value: undefined): undefined;
export function toNumberOrNull(value: Prisma.Decimal | null): number | null;
export function toNumberOrNull(
  value: Prisma.Decimal | undefined
): number | undefined;
export function toNumberOrNull(
  value: Prisma.Decimal | null | undefined
): number | null | undefined;
export function toNumberOrNull(
  value: Prisma.Decimal | null | undefined
): number | null | undefined {
  if (value === null || value === undefined) return value;
  return Number(value);
}
