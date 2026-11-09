import { describe, expect, it } from "vitest";
import { getEmissionFactorYearOptions } from "./emissionFactorYearOptions";

describe("getEmissionFactorYearOptions", () => {
  it("spans four years back and one ahead, newest first", () => {
    expect(getEmissionFactorYearOptions(2026)).toEqual([
      2027, 2026, 2025, 2024, 2023, 2022,
    ]);
  });

  it("slides with the current year", () => {
    expect(getEmissionFactorYearOptions(2030)[0]).toBe(2031);
  });
});
