import { describe, expect, it } from "vitest";
import type { EmissionFactorForm } from "@repo/types";

import { resolveLockedSource } from "./emissionFactorSourceLock";

const factor = (
  overrides: Partial<EmissionFactorForm> & Pick<EmissionFactorForm, "id">
): EmissionFactorForm => ({
  subcategoryId: "sub-1",
  dimensionValue1Name: null,
  dimensionValue2Name: null,
  rateMeasurementUnitId: "unit-1",
  source: "DEFRA 2025",
  year: 2025,
  value: 1,
  gasDetails: {
    CO2_FOSSIL: 0,
    CH4: 0,
    N2O: 0,
    HFC: 0,
    PFC: 0,
    SF6: 0,
    NF3: 0,
  },
  ...overrides,
});

describe("resolveLockedSource", () => {
  it("locks nothing when the subcategory has no other factor", () => {
    const row = factor({ id: "1" });

    expect(resolveLockedSource([row], row)).toBeUndefined();
  });

  it("takes the source of another factor of the same subcategory and year", () => {
    const existing = factor({ id: "1", source: "IPCC" });
    const row = factor({ id: "2", source: "" });

    expect(resolveLockedSource([existing, row], row)).toBe("IPCC");
  });

  it("does not reach across years", () => {
    const existing = factor({ id: "1", source: "DEFRA 2025", year: 2025 });
    const row = factor({ id: "2", source: "DEFRA 2026", year: 2026 });

    expect(resolveLockedSource([existing, row], row)).toBeUndefined();
  });

  it("does not reach across subcategories", () => {
    const existing = factor({ id: "1", subcategoryId: "sub-2" });
    const row = factor({ id: "2", source: "" });

    expect(resolveLockedSource([existing, row], row)).toBeUndefined();
  });

  it("ignores the row itself", () => {
    const row = factor({ id: "1", source: "IPCC" });

    expect(resolveLockedSource([row], row)).toBeUndefined();
  });

  it("locks nothing while the row has no subcategory yet", () => {
    const existing = factor({ id: "1", source: "IPCC" });
    const row = factor({ id: "2", subcategoryId: "", source: "" });

    expect(resolveLockedSource([existing, row], row)).toBeUndefined();
  });
});
