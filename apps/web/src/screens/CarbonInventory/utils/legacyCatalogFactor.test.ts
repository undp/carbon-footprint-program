import { describe, expect, it } from "vitest";
import {
  resolveLegacyCatalogFactorId,
  type LegacyCatalogFactorLine,
} from "./legacyCatalogFactor";
import type { MethodologyEmissionFactor } from "../types";

const line = (
  overrides: Partial<LegacyCatalogFactorLine> = {}
): LegacyCatalogFactorLine => ({
  emissionFactorId: null,
  factorSource: "DEFRA",
  factorValue: 0.52,
  factorRateMeasurementUnitId: "3",
  dimensionValue1Id: "7",
  dimensionValue2Id: null,
  ...overrides,
});

const factor = (
  overrides: Partial<MethodologyEmissionFactor> = {}
): MethodologyEmissionFactor => ({
  id: "11",
  baseEmissionFactorId: "11",
  originalEmissionFactorId: null,
  source: "DEFRA",
  year: 2022,
  value: "0.52",
  rateMeasurementUnitId: "3",
  dimensionValue1Id: "7",
  dimensionValue2Id: null,
  gasDetails: {},
  ...overrides,
});

describe("resolveLegacyCatalogFactorId", () => {
  it("keeps the stored id when the line has one", () => {
    expect(
      resolveLegacyCatalogFactorId(line({ emissionFactorId: "42" }), [factor()])
    ).toBe("42");
  });

  it("recovers the catalog identity of a line saved without one", () => {
    expect(resolveLegacyCatalogFactorId(line(), [factor()])).toBe("11");
  });

  it("keeps the cell empty when two vintages match equally well", () => {
    // Same provider, same value, same unit: the vintage the organization chose
    // is not recoverable, and guessing one would date the line wrongly.
    const result = resolveLegacyCatalogFactorId(line(), [
      factor({ id: "11", baseEmissionFactorId: "11", year: 2022 }),
      factor({ id: "12", baseEmissionFactorId: "12", year: 2025 }),
    ]);

    expect(result).toBeNull();
  });

  it("treats every representation of one catalog factor as a single match", () => {
    const result = resolveLegacyCatalogFactorId(line(), [
      factor({ id: "11", baseEmissionFactorId: "11" }),
      factor({ id: "11-2", baseEmissionFactorId: "11", year: 2022 }),
    ]);

    expect(result).toBe("11");
  });

  it("ignores a custom factor", () => {
    expect(
      resolveLegacyCatalogFactorId(line({ factorSource: "Otro" }), [factor()])
    ).toBeNull();
  });

  it("ignores a factor from another unit, value or dimension", () => {
    expect(
      resolveLegacyCatalogFactorId(line(), [
        factor({ rateMeasurementUnitId: "4" }),
      ])
    ).toBeNull();
    expect(
      resolveLegacyCatalogFactorId(line(), [factor({ value: "0.61" })])
    ).toBeNull();
    expect(
      resolveLegacyCatalogFactorId(line(), [factor({ dimensionValue1Id: "8" })])
    ).toBeNull();
  });

  it("accepts a factor left blank on a dimension the line does fill", () => {
    expect(
      resolveLegacyCatalogFactorId(line(), [
        factor({ dimensionValue1Id: null }),
      ])
    ).toBe("11");
  });

  it("tolerates the precision a stored value loses on its way to a double", () => {
    expect(
      resolveLegacyCatalogFactorId(line({ factorValue: 0.0569441234 }), [
        factor({ value: "0.05694412340000" }),
      ])
    ).toBe("11");
  });

  it("declines a line with no factor at all", () => {
    expect(
      resolveLegacyCatalogFactorId(
        line({ factorSource: null, factorValue: null }),
        [factor()]
      )
    ).toBeNull();
  });
});
