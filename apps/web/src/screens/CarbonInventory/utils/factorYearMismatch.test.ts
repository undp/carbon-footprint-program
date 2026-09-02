import { describe, expect, it } from "vitest";
import {
  buildFactorYearMismatchMessage,
  isFactorYearMismatch,
  summarizeFactorYearMismatches,
  type FactorYearLine,
} from "./factorYearMismatch";

/** A saved line that used a dated catalog factor. */
const datedCatalog = (year: number, overrides?: Partial<FactorYearLine>) => ({
  emissionFactorId: "1",
  appliedFactorYear: year,
  ...overrides,
});

/** A saved line that used a transversal catalog factor. */
const transversalCatalog: FactorYearLine = {
  emissionFactorId: "2",
  appliedFactorYear: null,
};

/** A custom factor: no catalog identity, no vintage. */
const customFactor: FactorYearLine = {
  emissionFactorId: null,
  appliedFactorYear: null,
};

/** A direct total and an incomplete line look the same to this rule. */
const directTotal: FactorYearLine = customFactor;
const incompleteLine: FactorYearLine = customFactor;

describe("summarizeFactorYearMismatches", () => {
  it("reports the affected and eligible counts and the distinct years", () => {
    const summary = summarizeFactorYearMismatches(
      [
        datedCatalog(2021),
        datedCatalog(2022),
        datedCatalog(2022),
        datedCatalog(2023),
        datedCatalog(2023),
        datedCatalog(2023),
        datedCatalog(2023),
        datedCatalog(2023),
      ],
      2023
    );

    expect(summary).toEqual({
      affectedCount: 3,
      eligibleCount: 8,
      mismatchedYears: [2021, 2022],
      inventoryYear: 2023,
    });
  });

  it("sorts the mismatching years ascending and lists each once", () => {
    const summary = summarizeFactorYearMismatches(
      [datedCatalog(2022), datedCatalog(2019), datedCatalog(2022)],
      2023
    );

    expect(summary?.mismatchedYears).toEqual([2019, 2022]);
  });

  it("returns null when every dated catalog factor matches the footprint year", () => {
    expect(
      summarizeFactorYearMismatches([datedCatalog(2023)], 2023)
    ).toBeNull();
  });

  it("excludes transversal, custom, direct and incomplete lines", () => {
    // A subcategory made only of excluded line types must not warn, even when a
    // dated line that does match is present alongside them.
    expect(
      summarizeFactorYearMismatches(
        [
          transversalCatalog,
          customFactor,
          directTotal,
          incompleteLine,
          datedCatalog(2023),
        ],
        2023
      )
    ).toBeNull();
  });

  it("counts a transversal factor as neither affected nor eligible", () => {
    const summary = summarizeFactorYearMismatches(
      [transversalCatalog, datedCatalog(2021), datedCatalog(2023)],
      2023
    );

    expect(summary?.affectedCount).toBe(1);
    expect(summary?.eligibleCount).toBe(2);
  });

  it("excludes lines the user removed in the editor", () => {
    expect(
      summarizeFactorYearMismatches(
        [datedCatalog(2021, { isDeleted: true })],
        2023
      )
    ).toBeNull();
  });

  it("returns null when the inventory has no year to compare against", () => {
    expect(
      summarizeFactorYearMismatches([datedCatalog(2021)], null)
    ).toBeNull();
  });

  it("clears once the affected lines are replaced individually", () => {
    const before = [datedCatalog(2021), datedCatalog(2023)];
    expect(summarizeFactorYearMismatches(before, 2023)).not.toBeNull();

    // The organization corrects the stale line; nothing else changes.
    const after = [datedCatalog(2023), datedCatalog(2023)];
    expect(summarizeFactorYearMismatches(after, 2023)).toBeNull();
  });

  it("becomes a mismatch when the inventory year changes, with no line rewritten", () => {
    const lines = [datedCatalog(2022)];
    expect(summarizeFactorYearMismatches(lines, 2022)).toBeNull();
    expect(summarizeFactorYearMismatches(lines, 2023)?.affectedCount).toBe(1);
  });
});

describe("isFactorYearMismatch", () => {
  it("is false for a transversal factor whatever the footprint year", () => {
    expect(isFactorYearMismatch(transversalCatalog, 2023)).toBe(false);
  });

  it("is false for a custom factor", () => {
    expect(isFactorYearMismatch(customFactor, 2023)).toBe(false);
  });

  it("is true only for a dated catalog factor from another year", () => {
    expect(isFactorYearMismatch(datedCatalog(2023), 2023)).toBe(false);
    expect(isFactorYearMismatch(datedCatalog(2021), 2023)).toBe(true);
  });
});

describe("buildFactorYearMismatchMessage", () => {
  it("states the counts, the years, the footprint year and that nothing changed", () => {
    const message = buildFactorYearMismatchMessage({
      affectedCount: 3,
      eligibleCount: 8,
      mismatchedYears: [2021, 2022],
      inventoryYear: 2023,
    });

    expect(message).toBe(
      "3 de 8 líneas con factor de catálogo fechado usan factores de 2021 y 2022, distintos del año 2023 de la huella. Los cálculos no fueron modificados; revisa las fuentes si corresponde."
    );
  });

  it("reads correctly with a single mismatching year and a single line", () => {
    const message = buildFactorYearMismatchMessage({
      affectedCount: 1,
      eligibleCount: 1,
      mismatchedYears: [2020],
      inventoryYear: 2023,
    });

    expect(message).toContain("1 de 1 línea con factor de catálogo fechado");
    expect(message).toContain("usan factores de 2020");
    expect(message).toContain("Los cálculos no fueron modificados");
  });
});
