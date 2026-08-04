import { describe, it, expect } from "vitest";
import { Prisma } from "@repo/database";
import { mapDecimalField, decimalEquals } from "@/utils/decimal.js";

describe("mapDecimalField", () => {
  it("returns undefined when the value is undefined", () => {
    expect(mapDecimalField(undefined)).toBeUndefined();
  });

  it("returns null when the value is null", () => {
    expect(mapDecimalField(null)).toBeNull();
  });

  it("returns a Prisma.Decimal for a numeric value", () => {
    const result = mapDecimalField(5);
    expect(result).toBeInstanceOf(Prisma.Decimal);
    expect(result.equals(new Prisma.Decimal(5))).toBe(true);
  });

  it("wraps zero as a Prisma.Decimal", () => {
    const result = mapDecimalField(0);
    expect(result).toBeInstanceOf(Prisma.Decimal);
    expect(result.equals(new Prisma.Decimal(0))).toBe(true);
  });
});

describe("decimalEquals", () => {
  it("treats null and undefined as equivalent", () => {
    expect(decimalEquals(null, undefined)).toBe(true);
    expect(decimalEquals(undefined, null)).toBe(true);
    expect(decimalEquals(null, null)).toBe(true);
    expect(decimalEquals(undefined, undefined)).toBe(true);
  });

  it("returns false when only the first value is null/undefined", () => {
    expect(decimalEquals(null, new Prisma.Decimal(1))).toBe(false);
    expect(decimalEquals(undefined, new Prisma.Decimal(1))).toBe(false);
  });

  it("returns false when only the second value is null/undefined", () => {
    expect(decimalEquals(new Prisma.Decimal(1), null)).toBe(false);
    expect(decimalEquals(new Prisma.Decimal(1), undefined)).toBe(false);
  });

  it("returns true for equal decimals", () => {
    expect(decimalEquals(new Prisma.Decimal(5), new Prisma.Decimal(5))).toBe(
      true
    );
  });

  it("returns false for unequal decimals", () => {
    expect(decimalEquals(new Prisma.Decimal(5), new Prisma.Decimal(6))).toBe(
      false
    );
  });
});
