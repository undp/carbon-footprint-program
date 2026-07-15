import { describe, it, expect } from "vitest";
import {
  mapBigIntField,
  bigIntEquals,
  toNullableBigInt,
} from "@/utils/bigint.js";

describe("mapBigIntField", () => {
  it("returns undefined when the value is undefined", () => {
    expect(mapBigIntField(undefined)).toBeUndefined();
  });

  it("returns null when the value is null", () => {
    expect(mapBigIntField(null)).toBeNull();
  });

  it("returns a bigint for a string value", () => {
    expect(mapBigIntField("42")).toBe(42n);
  });
});

describe("bigIntEquals", () => {
  it("treats null and undefined as equivalent", () => {
    expect(bigIntEquals(null, undefined)).toBe(true);
    expect(bigIntEquals(undefined, null)).toBe(true);
    expect(bigIntEquals(null, null)).toBe(true);
    expect(bigIntEquals(undefined, undefined)).toBe(true);
  });

  it("returns false when only the first value is null/undefined", () => {
    expect(bigIntEquals(null, 1n)).toBe(false);
    expect(bigIntEquals(undefined, 1n)).toBe(false);
  });

  it("returns false when only the second value is null/undefined", () => {
    expect(bigIntEquals(1n, null)).toBe(false);
    expect(bigIntEquals(1n, undefined)).toBe(false);
  });

  it("returns true for equal bigints", () => {
    expect(bigIntEquals(5n, 5n)).toBe(true);
  });

  it("returns false for unequal bigints", () => {
    expect(bigIntEquals(5n, 6n)).toBe(false);
  });
});

describe("toNullableBigInt", () => {
  it("returns a bigint for a truthy string", () => {
    expect(toNullableBigInt("7")).toBe(7n);
  });

  it("returns null for null", () => {
    expect(toNullableBigInt(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(toNullableBigInt(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(toNullableBigInt("")).toBeNull();
  });
});
