import { describe, expect, it } from "vitest";
import { REDUCTION_PROJECT_CONSIDERED_GEI } from "@repo/constants";
import { CONSIDERED_GEI_LABELS, formatConsideredGei } from "./consideredGei";

describe("CONSIDERED_GEI_LABELS", () => {
  it("has a label for every considered GEI code", () => {
    expect(Object.keys(CONSIDERED_GEI_LABELS).sort()).toEqual(
      [...REDUCTION_PROJECT_CONSIDERED_GEI].sort()
    );
  });
});

describe("formatConsideredGei", () => {
  it("joins the labels in the fixed gas order", () => {
    expect(formatConsideredGei(["SF6", "N2O", "CO2"])).toBe(
      "Dióxido de carbono (CO₂), Óxido nitroso (N₂O), Hexafluoruro de azufre (SF₆)"
    );
  });

  it("joins an empty list to an empty string", () => {
    expect(formatConsideredGei([])).toBe("");
  });
});
