import { describe, expect, it } from "vitest";
import { kgToTon, tonToKg, toNullableNumber } from "./number";

describe("kgToTon", () => {
  it.each([
    [1000, 1],
    [500, 0.5],
    [0, 0],
    [-2000, -2],
    [1, 0.001],
  ])("converts %d kg to %d ton", (kg, expected) => {
    expect(kgToTon(kg)).toBe(expected);
  });
});

describe("tonToKg", () => {
  it.each([
    [1, 1000],
    [0.5, 500],
    [0, 0],
    [-2, -2000],
    [0.001, 1],
  ])("converts %d ton to %d kg", (ton, expected) => {
    expect(tonToKg(ton)).toBe(expected);
  });

  it("round-trips with kgToTon", () => {
    expect(kgToTon(tonToKg(42))).toBe(42);
  });
});

describe("toNullableNumber", () => {
  it.each([
    ["null", null, null],
    ["undefined", undefined, null],
    ["finite number", 42, 42],
    ["zero", 0, 0],
    ["negative number", -5, -5],
    ["float number", 3.14, 3.14],
    ["NaN", Number.NaN, null],
    ["Infinity", Number.POSITIVE_INFINITY, null],
    ["-Infinity", Number.NEGATIVE_INFINITY, null],
    ["integer string", "42", 42],
    ["padded numeric string", "  3.5  ", 3.5],
    ["negative numeric string", "-7", -7],
    ["zero string", "0", 0],
    ["empty string", "", null],
    ["whitespace-only string", "   ", null],
    ["non-numeric string", "abc", null],
    ["Infinity string", "Infinity", null],
    ["thousands-separator string", "1,000", null],
    ["boolean", true, null],
    ["object", {}, null],
    ["array", [], null],
  ])("returns the expected value for %s", (_label, input, expected) => {
    expect(toNullableNumber(input)).toBe(expected);
  });
});
