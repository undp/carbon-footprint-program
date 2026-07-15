import { describe, it, expect } from "vitest";
import { stringEquals } from "@/utils/string.js";

describe("stringEquals", () => {
  it("treats null and undefined as equivalent", () => {
    expect(stringEquals(null, undefined)).toBe(true);
    expect(stringEquals(undefined, null)).toBe(true);
    expect(stringEquals(null, null)).toBe(true);
    expect(stringEquals(undefined, undefined)).toBe(true);
  });

  it("returns false when only the first value is null/undefined", () => {
    expect(stringEquals(null, "a")).toBe(false);
    expect(stringEquals(undefined, "a")).toBe(false);
  });

  it("returns false when only the second value is null/undefined", () => {
    expect(stringEquals("a", null)).toBe(false);
    expect(stringEquals("a", undefined)).toBe(false);
  });

  it("returns true for equal strings", () => {
    expect(stringEquals("hello", "hello")).toBe(true);
  });

  it("returns false for unequal strings", () => {
    expect(stringEquals("hello", "world")).toBe(false);
  });
});
