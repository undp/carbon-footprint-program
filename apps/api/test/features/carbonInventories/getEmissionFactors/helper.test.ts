import { describe, it, expect } from "vitest";
import {
  buildGasBreakdownLines,
  parseFactorSource,
} from "@/features/carbonInventories/getEmissionFactors/helper.js";

describe("buildGasBreakdownLines", () => {
  it("returns [] when gasDetails is null", () => {
    expect(buildGasBreakdownLines(null)).toEqual([]);
  });

  it("returns [] when gasDetails is undefined", () => {
    expect(buildGasBreakdownLines(undefined)).toEqual([]);
  });

  it("returns [] when gasDetails is not an object (string)", () => {
    expect(buildGasBreakdownLines("not-an-object")).toEqual([]);
  });

  it("returns [] when gasDetails is not an object (number)", () => {
    expect(buildGasBreakdownLines(42)).toEqual([]);
  });

  it("returns [] when gasDetails is an empty object", () => {
    expect(buildGasBreakdownLines({})).toEqual([]);
  });

  it("includes a line for each recognized gas field with a nonzero finite value", () => {
    const lines = buildGasBreakdownLines({
      co2: 100,
      co2Fossil: 50,
      ch4: 2.5,
      n2o: 0.1,
      hfc: 1,
      pfc: 1,
      sf6: 1,
      nf3: 1,
    });

    expect(lines).toEqual([
      { value: 100, gas: "CO₂" },
      { value: 50, gas: "CO₂" },
      { value: 2.5, gas: "CH4" },
      { value: 0.1, gas: "N₂O" },
      { value: 1, gas: "HFC" },
      { value: 1, gas: "PFC" },
      { value: 1, gas: "SF6" },
      { value: 1, gas: "NF3" },
    ]);
  });

  it("excludes a field when its value is undefined", () => {
    const lines = buildGasBreakdownLines({ co2: undefined, ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("excludes a field when its value is null", () => {
    const lines = buildGasBreakdownLines({ co2: null, ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("excludes a field when its value is the number 0", () => {
    const lines = buildGasBreakdownLines({ co2: 0, ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("excludes a field when its value is a non-finite number after coercion (NaN)", () => {
    const lines = buildGasBreakdownLines({ co2: "not-a-number", ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("excludes a field when its value is a non-finite number (Infinity)", () => {
    const lines = buildGasBreakdownLines({ co2: Infinity, ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("excludes a field whose coerced numeric value is 0 (string '0')", () => {
    // val !== 0 passes (string "0" !== number 0), but Number("0") === 0 so it
    // must still be filtered out by the numVal !== 0 check.
    const lines = buildGasBreakdownLines({ co2: "0", ch4: 10 });
    expect(lines).toEqual([{ value: 10, gas: "CH4" }]);
  });

  it("coerces numeric strings to numbers", () => {
    const lines = buildGasBreakdownLines({ co2: "123.5" });
    expect(lines).toEqual([{ value: 123.5, gas: "CO₂" }]);
  });

  it("ignores unrecognized keys", () => {
    const lines = buildGasBreakdownLines({ unknownGas: 100 });
    expect(lines).toEqual([]);
  });
});

describe("parseFactorSource", () => {
  it("returns the whole string as factorSource with null detail when there is no ' - ' separator", () => {
    expect(parseFactorSource("DEFRA 2025")).toEqual({
      factorSource: "DEFRA 2025",
      factorSourceDetail: null,
    });
  });

  it("splits on the first ' - ' separator into source and detail", () => {
    expect(
      parseFactorSource("DEFRA 2025 - Fuels - Coal (industrial) - tonnes")
    ).toEqual({
      factorSource: "DEFRA 2025",
      factorSourceDetail: "Fuels - Coal (industrial) - tonnes",
    });
  });

  it("trims whitespace around the split source and detail", () => {
    expect(parseFactorSource("Source A  -  Detail B")).toEqual({
      factorSource: "Source A",
      factorSourceDetail: "Detail B",
    });
  });

  it("returns an empty-string source with null detail for the empty string input", () => {
    expect(parseFactorSource("")).toEqual({
      factorSource: "",
      factorSourceDetail: null,
    });
  });
});
