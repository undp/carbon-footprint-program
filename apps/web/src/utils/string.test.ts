import { describe, expect, it } from "vitest";
import { toSafeString } from "./string";

describe("toSafeString", () => {
  it.each([
    ["null", null, ""],
    ["undefined", undefined, ""],
    ["empty string", "", ""],
    ["plain string", "hola", "hola"],
    ["numeric string", "123", "123"],
    ["integer", 0, "0"],
    ["negative number", -5, "-5"],
    ["float", 3.14, "3.14"],
    ["NaN (still a number)", Number.NaN, "NaN"],
    ["boolean", true, ""],
    ["object", {}, ""],
    ["array", [1, 2], ""],
  ])("returns the expected string for %s", (_label, input, expected) => {
    expect(toSafeString(input)).toBe(expected);
  });
});
