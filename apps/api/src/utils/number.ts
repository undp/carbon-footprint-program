import { Prisma } from "@repo/database";

/**
 * Converts a value to a number if it's not null/undefined, otherwise returns null.
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
  if (value === null || value == undefined) return value;
  return Number(value);
}
