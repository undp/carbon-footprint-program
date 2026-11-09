import { describe, expect, it } from "vitest";
import {
  formatCopyValueVariation,
  getCopyValueWarning,
  getDefaultCopyYears,
} from "./emissionFactorYearCopy";

describe("getCopyValueWarning", () => {
  it("says nothing for an unchanged or emptied value", () => {
    expect(getCopyValueWarning(0.177, 0.177)).toBeNull();
    expect(getCopyValueWarning(0.177, null)).toBeNull();
  });

  it("gives a small change as a percentage that does not warn", () => {
    const variation = getCopyValueWarning(0.177, 0.207);
    expect(variation).toMatchObject({ kind: "percent", isWarning: false });
    expect(formatCopyValueVariation(variation!)).toBe("+16,95 %");
  });

  it("warns beyond 25 %", () => {
    expect(getCopyValueWarning(100, 126)).toMatchObject({
      kind: "percent",
      isWarning: true,
    });
    expect(getCopyValueWarning(100, 75)).toMatchObject({ isWarning: false });
  });

  it("reads a ÷1000 change as a unit error", () => {
    const variation = getCopyValueWarning(1720, 1.72);
    expect(variation).toMatchObject({
      kind: "ratio",
      direction: "down",
      isWarning: true,
    });
    expect(formatCopyValueVariation(variation!)).toBe("÷1000");
  });

  it("reads a ×10 change as a unit error", () => {
    const variation = getCopyValueWarning(2.5, 25);
    expect(formatCopyValueVariation(variation!)).toBe("×10");
  });

  it("gives a sign change as a warning percentage", () => {
    const variation = getCopyValueWarning(0.5, -0.5);
    expect(variation).toMatchObject({ kind: "percent", isWarning: true });
    expect(formatCopyValueVariation(variation!)).toBe("−200 %");
  });

  it("warns about a change from zero", () => {
    expect(getCopyValueWarning(0, 1)).toEqual({
      kind: "fromZero",
      isWarning: true,
    });
  });
});

describe("getDefaultCopyYears", () => {
  const window = [2027, 2026, 2025, 2024, 2023, 2022];

  it("copies the latest year into the next one", () => {
    expect(getDefaultCopyYears([2025, 2026], window)).toEqual({
      sourceYear: 2026,
      targetYear: 2027,
    });
  });

  it("falls back to the newest window year when the next one is outside it", () => {
    expect(getDefaultCopyYears([2025, 2027], window)).toEqual({
      sourceYear: 2027,
      targetYear: 2026,
    });
  });

  it("has nothing to copy without source years", () => {
    expect(getDefaultCopyYears([], window)).toBeNull();
  });
});
