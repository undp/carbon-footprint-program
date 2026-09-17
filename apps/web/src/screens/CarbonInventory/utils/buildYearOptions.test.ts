import { describe, expect, it } from "vitest";
import { buildYearOptions } from "./buildYearOptions";

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
});
