import { describe, expect, it } from "vitest";
import {
  FactorYearRank,
  buildFactorOptionLabel,
  getCatalogFactorOptions,
  rankCatalogFactorsByYear,
  recommendCatalogFactor,
  sortDimensionValuesWithOtherLast,
} from "./emissionFactorService";
import type { MethodologyEmissionFactor } from "../../../types";

type DimensionValue = { id: string; value: string };

describe("sortDimensionValuesWithOtherLast", () => {
  it("moves the 'Otro' escape hatch to the end of an alphabetical catalog", () => {
    const values: DimensionValue[] = [
      { id: "1", value: "Excavadora" },
      { id: "2", value: "Motoniveladora" },
      { id: "3", value: "Otro" },
      { id: "4", value: "Retroexcavadora" },
    ];

    expect(
      sortDimensionValuesWithOtherLast(values).map((v) => v.value)
    ).toEqual(["Excavadora", "Motoniveladora", "Retroexcavadora", "Otro"]);
  });

  it("preserves the incoming order of every other value", () => {
    const values: DimensionValue[] = [
      { id: "1", value: "Gas natural" },
      { id: "2", value: "GLP" },
      { id: "3", value: "Diésel" },
    ];

    expect(
      sortDimensionValuesWithOtherLast(values).map((v) => v.value)
    ).toEqual(["Gas natural", "GLP", "Diésel"]);
  });

  it("leaves catalogs without an 'Otro' value untouched", () => {
    const values: DimensionValue[] = [
      { id: "1", value: "Nitrógeno (N)" },
      { id: "2", value: "Fósforo (P2O5)" },
    ];

    expect(sortDimensionValuesWithOtherLast(values)).toEqual(values);
  });

  it("does not treat values that merely start with 'Otro' as the escape hatch", () => {
    // "Otro proceso" and "Otro país" are real catalog values with their own
    // emission factor, so they must keep their alphabetical position.
    const values: DimensionValue[] = [
      { id: "1", value: "Otro proceso" },
      { id: "2", value: "Pirometalúrgico" },
      { id: "3", value: "Waelz Kiln" },
    ];

    expect(
      sortDimensionValuesWithOtherLast(values).map((v) => v.value)
    ).toEqual(["Otro proceso", "Pirometalúrgico", "Waelz Kiln"]);
  });

  it("returns an empty list unchanged", () => {
    expect(sortDimensionValuesWithOtherLast([])).toEqual([]);
  });

  // A methodology maintainer types variable names by hand, so a catalog curated
  // after the seed can spell the escape hatch differently.
  it.each(["Otros", "Otra", "Otras", "otros", "OTRO", "  Otro  "])(
    "pins the hand-typed variant %j last",
    (other) => {
      const values: DimensionValue[] = [
        { id: "1", value: "Avión" },
        { id: "2", value: other },
        { id: "3", value: "Tren" },
      ];

      expect(
        sortDimensionValuesWithOtherLast(values).map((v) => v.value)
      ).toEqual(["Avión", "Tren", other]);
    }
  );

  it("keeps the relative order of several escape-hatch wordings", () => {
    const values: DimensionValue[] = [
      { id: "1", value: "Otros" },
      { id: "2", value: "Camión" },
      { id: "3", value: "Otro" },
    ];

    expect(
      sortDimensionValuesWithOtherLast(values).map((v) => v.value)
    ).toEqual(["Camión", "Otros", "Otro"]);
  });
});

type FactorFixture = {
  source: string;
  year: number | null;
  rateMeasurementUnitId?: string;
  dimensionValue1Id?: string | null;
  dimensionValue2Id?: string | null;
  /** Defaults to a fresh canonical factor; pass to model a converted unit. */
  baseEmissionFactorId?: string;
};

let nextFactorId = 0;

/**
 * Builds the subset of a methodology factor the ranking helpers read. Typed
 * loosely on purpose: pinning the full response shape here would make the tests
 * churn on unrelated payload fields.
 */
const factor = (fixture: FactorFixture) => {
  const id = fixture.baseEmissionFactorId ?? String(++nextFactorId);
  return {
    id,
    baseEmissionFactorId: id,
    originalEmissionFactorId: null,
    source: fixture.source,
    year: fixture.year,
    rateMeasurementUnitId: fixture.rateMeasurementUnitId ?? "kg/kWh",
    dimensionValue1Id: fixture.dimensionValue1Id ?? null,
    dimensionValue2Id: fixture.dimensionValue2Id ?? null,
    value: "1",
    gasDetails: {},
  } as unknown as MethodologyEmissionFactor;
};

const recommend = (
  factors: MethodologyEmissionFactor[],
  inventoryYear: number | null
) => recommendCatalogFactor(factors, null, null, "kg/kWh", inventoryYear);

describe("buildFactorOptionLabel", () => {
  it("appends the year to a dated factor", () => {
    expect(buildFactorOptionLabel({ source: "DEFRA", year: 2025 })).toBe(
      "DEFRA (2025)"
    );
  });

  it("shows only the provider for a transversal factor", () => {
    // The parentheses are what mark a factor as dated, so a transversal factor
    // must not get them — and must not be labelled "(Transversal)" either.
    expect(buildFactorOptionLabel({ source: "IPCC", year: null })).toBe("IPCC");
    expect(buildFactorOptionLabel({ source: "Kool, A.", year: null })).toBe(
      "Kool, A."
    );
  });
});

describe("rankCatalogFactorsByYear", () => {
  it("prefers the exact footprint year", () => {
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2022 }),
        factor({ source: "DEFRA", year: 2023 }),
        factor({ source: "DEFRA", year: 2025 }),
      ],
      2023
    );

    expect(ranked?.rank).toBe(FactorYearRank.EXACT_YEAR);
    expect(ranked?.candidates.map((c) => c.year)).toEqual([2023]);
  });

  it("prefers a transversal factor over any dated fallback", () => {
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2022 }),
        factor({ source: "IPCC", year: null }),
        factor({ source: "DEFRA", year: 2025 }),
      ],
      2023
    );

    expect(ranked?.rank).toBe(FactorYearRank.TRANSVERSAL);
    expect(ranked?.candidates.map((c) => c.source)).toEqual(["IPCC"]);
  });

  it("falls back to the nearest earlier year before any later one", () => {
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2020 }),
        factor({ source: "DEFRA", year: 2022 }),
        factor({ source: "DEFRA", year: 2025 }),
      ],
      2023
    );

    expect(ranked?.rank).toBe(FactorYearRank.NEAREST_EARLIER);
    expect(ranked?.candidates.map((c) => c.year)).toEqual([2022]);
  });

  it("falls back to the nearest later year only when nothing earlier exists", () => {
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2025 }),
        factor({ source: "DEFRA", year: 2027 }),
      ],
      2022
    );

    expect(ranked?.rank).toBe(FactorYearRank.NEAREST_LATER);
    expect(ranked?.candidates.map((c) => c.year)).toEqual([2025]);
  });

  it("counts one canonical factor once, however many units it is expressed in", () => {
    // The payload expands a factor into every unit of its family. Without
    // deduplication a single factor would look like a tie with itself and
    // nothing would be preselected.
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2023, baseEmissionFactorId: "7" }),
        factor({ source: "DEFRA", year: 2023, baseEmissionFactorId: "7" }),
      ],
      2023
    );

    expect(ranked?.candidates).toHaveLength(1);
  });

  it("returns null when nothing is compatible", () => {
    expect(rankCatalogFactorsByYear([], 2023)).toBeNull();
  });

  it("ranks only transversal factors when the inventory has no year", () => {
    const ranked = rankCatalogFactorsByYear(
      [
        factor({ source: "DEFRA", year: 2025 }),
        factor({ source: "IPCC", year: null }),
      ],
      null
    );

    expect(ranked?.rank).toBe(FactorYearRank.TRANSVERSAL);
    expect(ranked?.candidates.map((c) => c.source)).toEqual(["IPCC"]);
  });

  it("returns null when the inventory has no year and every factor is dated", () => {
    expect(
      rankCatalogFactorsByYear([factor({ source: "DEFRA", year: 2025 })], null)
    ).toBeNull();
  });
});

describe("recommendCatalogFactor", () => {
  it("recommends the only factor at the winning rank", () => {
    const only = factor({ source: "DEFRA", year: 2023 });
    expect(recommend([only], 2023).recommended?.source).toBe("DEFRA");
  });

  it("recommends nothing when two providers tie on the exact year", () => {
    const result = recommend(
      [
        factor({ source: "DEFRA", year: 2023 }),
        factor({ source: "IPCC", year: 2023 }),
      ],
      2023
    );

    expect(result.recommended).toBeNull();
    // The tie is handed back in full so the UI can present both.
    expect(result.candidates.map((c) => c.source).sort()).toEqual([
      "DEFRA",
      "IPCC",
    ]);
  });

  it("recommends nothing when two transversal providers tie", () => {
    const result = recommend(
      [
        factor({ source: "IPCC", year: null }),
        factor({ source: "Kool, A.", year: null }),
      ],
      2023
    );

    expect(result.recommended).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });

  it("does not break a tie by array order", () => {
    const defra = factor({ source: "DEFRA", year: 2023 });
    const ipcc = factor({ source: "IPCC", year: 2023 });

    expect(recommend([defra, ipcc], 2023).recommended).toBeNull();
    expect(recommend([ipcc, defra], 2023).recommended).toBeNull();
  });

  it("recommends nothing when no factor is compatible", () => {
    const result = recommend([], 2023);
    expect(result.recommended).toBeNull();
    expect(result.candidates).toEqual([]);
    expect(result.rank).toBeNull();
  });

  it("ignores factors from another unit family", () => {
    // Compatible representations are pre-expanded per unit, so a factor in a
    // different family simply never matches the line's rate unit.
    const result = recommendCatalogFactor(
      [factor({ source: "DEFRA", year: 2023, rateMeasurementUnitId: "kg/m3" })],
      null,
      null,
      "kg/kWh",
      2023
    );

    expect(result.recommended).toBeNull();
    expect(result.candidates).toEqual([]);
  });
});

describe("getCatalogFactorOptions", () => {
  it("lists one option per canonical factor, newest year first and transversal last", () => {
    const options = getCatalogFactorOptions(
      [
        factor({ source: "IPCC", year: null }),
        factor({ source: "DEFRA", year: 2022 }),
        factor({ source: "DEFRA", year: 2025 }),
      ],
      null,
      null,
      "kg/kWh"
    );

    expect(options.map((o) => o.label)).toEqual([
      "DEFRA (2025)",
      "DEFRA (2022)",
      "IPCC",
    ]);
  });

  it("keys each option on the canonical factor ID, not on its source", () => {
    const options = getCatalogFactorOptions(
      [
        factor({ source: "DEFRA", year: 2022, baseEmissionFactorId: "11" }),
        factor({ source: "DEFRA", year: 2025, baseEmissionFactorId: "12" }),
      ],
      null,
      null,
      "kg/kWh"
    );

    // Two vintages share a source, so a source-keyed selector would collapse
    // them into one option.
    expect(options.map((o) => o.id)).toEqual(["12", "11"]);
  });

  it("returns nothing when the line has no compatible rate unit yet", () => {
    expect(
      getCatalogFactorOptions(
        [factor({ source: "DEFRA", year: 2025 })],
        null,
        null,
        null
      )
    ).toEqual([]);
  });
});
