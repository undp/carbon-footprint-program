import { describe, expect, it } from "vitest";
import { buildDeclarableYears, buildYearOptions } from "./buildYearOptions";
import { CALCULATOR_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";

describe("buildYearOptions", () => {
  it("returns the catalogue years as strings, oldest first", () => {
    expect(buildYearOptions([2026, 2024, 2025], null)).toEqual([
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("keeps the footprint's own year even when the catalogue dropped it", () => {
    expect(buildYearOptions([2025, 2026], 2023)).toEqual([
      "2023",
      "2025",
      "2026",
    ]);
  });

  it("does not duplicate the footprint's year when the catalogue covers it", () => {
    expect(buildYearOptions([2025, 2026], 2025)).toEqual(["2025", "2026"]);
  });

  it("offers only the footprint's year when the catalogue is empty", () => {
    expect(buildYearOptions([], 2025)).toEqual(["2025"]);
  });

  it("offers nothing when there is neither a catalogue nor a year", () => {
    expect(buildYearOptions([], null)).toEqual([]);
  });

  it("merges the years offered beyond the catalogue, without duplicating them", () => {
    expect(buildYearOptions([2025], null, [2026, 2025, 2024])).toEqual([
      "2024",
      "2025",
      "2026",
    ]);
  });

  it("offers the years beyond the catalogue even when the catalogue is empty", () => {
    expect(buildYearOptions([], null, [2025, 2024])).toEqual(["2024", "2025"]);
  });
});

describe("buildDeclarableYears", () => {
  it("counts back from the given year, the given year included", () => {
    expect(buildDeclarableYears(2026)).toEqual([2026, 2025, 2024, 2023, 2022]);
  });

  it("spans as many years as the configured range", () => {
    expect(buildDeclarableYears(2026)).toHaveLength(
      CALCULATOR_YEARS_RANGE_FROM_CURRENT
    );
  });
});
