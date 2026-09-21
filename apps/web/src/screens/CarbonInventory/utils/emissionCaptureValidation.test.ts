import { describe, expect, it } from "vitest";
import { hasNoCatalogueFactors } from "./emissionCaptureValidation";
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
