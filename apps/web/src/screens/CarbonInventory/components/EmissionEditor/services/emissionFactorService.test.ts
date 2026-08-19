import { describe, expect, it } from "vitest";
import { sortDimensionValuesWithOtherLast } from "./emissionFactorService";

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
});
