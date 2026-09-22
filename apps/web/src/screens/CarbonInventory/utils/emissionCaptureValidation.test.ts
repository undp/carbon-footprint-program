import { describe, expect, it } from "vitest";
import {
  hasNoCatalogueFactors,
  resolveEmptyCatalogueNotice,
} from "./emissionCaptureValidation";
import type { CategoryWithSubcategoriesAndLines } from "../types/EmissionCaptureTypes";

const buildCategories = (
  subcategoryFactorCounts: number[][]
): CategoryWithSubcategoriesAndLines[] =>
  subcategoryFactorCounts.map(
    (category) =>
      ({
        subcategories: category.map((count) => ({
          emissionFactors: Array.from({ length: count }, () => ({})),
        })),
      }) as CategoryWithSubcategoriesAndLines
  );

describe("hasNoCatalogueFactors", () => {
  it("reports an empty catalogue when no subcategory offers a factor", () => {
    // The shape a footprint of a year the catalogue does not cover comes back
    // with: every list filtered down to nothing by the year.
    expect(hasNoCatalogueFactors(buildCategories([[0, 0], [0]]))).toBe(true);
  });

  it("does not report one when a single subcategory offers a factor", () => {
    // A subcategory with no factor is ordinary; the catalogue being absent is
    // what the notice is about.
    expect(hasNoCatalogueFactors(buildCategories([[0, 0], [3]]))).toBe(false);
  });

  it("treats a methodology with no categories as empty", () => {
    expect(hasNoCatalogueFactors([])).toBe(true);
  });
});

describe("resolveEmptyCatalogueNotice", () => {
  const empty = buildCategories([[0, 0], [0]]);
  const stocked = buildCategories([[0, 0], [3]]);

  it("names the year whose catalogue is not loaded yet", () => {
    expect(resolveEmptyCatalogueNotice(2026, empty)).toBe("YEAR_NOT_LOADED");
  });

  it("names the missing year when the footprint has none", () => {
    // Reachable by URL: no route guard enforces the order of the steps, and a
    // footprint with no year is offered no factor at all.
    expect(resolveEmptyCatalogueNotice(null, empty)).toBe("NO_YEAR");
    expect(resolveEmptyCatalogueNotice(undefined, empty)).toBe("NO_YEAR");
  });

  it("says nothing when the catalogue has something to offer", () => {
    expect(resolveEmptyCatalogueNotice(2025, stocked)).toBeNull();
    expect(resolveEmptyCatalogueNotice(null, stocked)).toBeNull();
  });

  it("says nothing while there is no methodology to be empty", () => {
    expect(resolveEmptyCatalogueNotice(2026, [])).toBeNull();
    expect(resolveEmptyCatalogueNotice(2026, undefined)).toBeNull();
  });
});
