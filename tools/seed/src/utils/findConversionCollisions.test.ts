import { describe, expect, it } from "vitest";
import {
  describeConversionCollision,
  findConversionCollisions,
  type RateUnitMagnitudes,
  type SeededFactor,
} from "./findConversionCollisions.js";

const magnitudesByRateUnit = new Map<string, RateUnitMagnitudes>([
  ["kg/g", { numerator: "mass", denominator: "mass" }],
  ["kg/kg", { numerator: "mass", denominator: "mass" }],
  ["kg/ton", { numerator: "mass", denominator: "mass" }],
  ["kg/L", { numerator: "mass", denominator: "volume" }],
  ["kg/kWh", { numerator: "mass", denominator: "energy" }],
]);

function factor(overrides?: Partial<SeededFactor>): SeededFactor {
  return {
    subcategory: "Procesos industriales - Cal",
    dimensionValue1: "Cal alta en calcio",
    dimensionValue2: null,
    rateMeasurementUnitAbbreviation: "kg/ton",
    source: "IPCC",
    year: 2025,
    ...overrides,
  };
}

const find = (factors: SeededFactor[]) =>
  findConversionCollisions(factors, magnitudesByRateUnit).map(
    describeConversionCollision
  );

describe("findConversionCollisions", () => {
  it("reports a factor seeded in two units of the same magnitudes", () => {
    expect(
      find([factor(), factor({ rateMeasurementUnitAbbreviation: "kg/kg" })])
    ).toEqual([
      "Procesos industriales - Cal, IPCC, 2025: Cal alta en calcio / (any) in kg/ton collides with Cal alta en calcio / (any) in kg/kg",
    ]);
  });

  it("reports a factor seeded twice in the same unit", () => {
    expect(find([factor(), factor()])).toHaveLength(1);
  });

  it("reports a NULL-dimension factor overlapping a specific one of the same source", () => {
    // Capture offers the generic factor for "Clinker" too, so the two compete.
    expect(
      find([
        factor({
          subcategory: "Procesos industriales - Cemento",
          dimensionValue1: "Clinker",
        }),
        factor({
          subcategory: "Procesos industriales - Cemento",
          dimensionValue1: null,
        }),
      ])
    ).toEqual([
      "Procesos industriales - Cemento, IPCC, 2025: Clinker / (any) in kg/ton collides with (any) / (any) in kg/ton",
    ]);
  });

  it("does not report one fuel in different magnitudes", () => {
    expect(
      find([
        factor({
          subcategory: "Combustiones estacionarias",
          dimensionValue1: null,
          dimensionValue2: "Diésel",
          rateMeasurementUnitAbbreviation: "kg/L",
        }),
        factor({
          subcategory: "Combustiones estacionarias",
          dimensionValue1: null,
          dimensionValue2: "Diésel",
          rateMeasurementUnitAbbreviation: "kg/kWh",
        }),
      ])
    ).toEqual([]);
  });

  it("does not report the same key in different years", () => {
    expect(find([factor(), factor({ year: 2026 })])).toEqual([]);
  });

  it("does not report a NULL-dimension factor under another source", () => {
    expect(
      find([
        factor({ dimensionValue1: "Clinker" }),
        factor({ dimensionValue1: null, source: "DEFRA 2025" }),
      ])
    ).toEqual([]);
  });

  it("does not report different values of a dimension", () => {
    expect(
      find([factor(), factor({ dimensionValue1: "Cal dolomítica" })])
    ).toEqual([]);
  });

  it("does not compare factors of different subcategories", () => {
    expect(
      find([factor(), factor({ subcategory: "Procesos industriales - Cinc" })])
    ).toEqual([]);
  });

  it("rejects a rate unit missing from the lookup", () => {
    expect(() =>
      find([factor({ rateMeasurementUnitAbbreviation: "kg/m3" })])
    ).toThrow(/Unknown rate measurement unit 'kg\/m3'/);
  });
});
