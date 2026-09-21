import { describe, expect, it } from "vitest";
import {
  isSelectedFactorAvailable,
  sortDimensionValuesWithOtherLast,
} from "./emissionFactorService";

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

describe("isSelectedFactorAvailable", () => {
  const factor = (id: string, originalEmissionFactorId: string | null) => ({
    id,
    originalEmissionFactorId,
  });

  it("keeps a selection that is still among the candidates", () => {
    // Two factors of the same source: one carries an optional dimension value
    // the other leaves null, which the maintainer's uniqueness rule allows.
    // Editing an unrelated cell must not cost the line the factor it holds.
    expect(
      isSelectedFactorAvailable([factor("10", null), factor("11", null)], "11")
    ).toBe(true);
  });

  it("matches a converted factor by its original id", () => {
    // The capture payload sends the original id, never the composite one.
    expect(isSelectedFactorAvailable([factor("10-1", "10")], "10")).toBe(true);
  });

  it("drops a selection that is no longer among them", () => {
    expect(isSelectedFactorAvailable([factor("10", null)], "11")).toBe(false);
  });

  it("treats a line with no factor as nothing to keep", () => {
    expect(isSelectedFactorAvailable([factor("10", null)], null)).toBe(false);
  });
});
