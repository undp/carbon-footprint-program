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

  it("does not lock two rows of the same group to each other", () => {
    // The mutual lock is what made the pair swap sources on every render: each
    // row read the other as its lock and wrote it into its own field.
    const first = factor({ id: "1", source: "IPCC" });
    const second = factor({ id: "2", source: "DEFRA 2025" });
    const rows = [first, second];

    expect(resolveLockedSource(rows, first)).toBeUndefined();
    expect(resolveLockedSource(rows, second)).toBe("IPCC");
  });

  it("anchors on the persisted row, not on a new one", () => {
    const added = factor({ id: "temp_1758000000000", source: "Propia" });
    const persisted = factor({ id: "5", source: "IPCC" });
    // New rows are prepended, so the grid order puts the new one first.
    const rows = [added, persisted];

    expect(resolveLockedSource(rows, added)).toBe("IPCC");
    expect(resolveLockedSource(rows, persisted)).toBeUndefined();
  });

  it("compares ids numerically so 9 anchors over 10", () => {
    const ninth = factor({ id: "9", source: "IPCC" });
    const tenth = factor({ id: "10", source: "DEFRA 2025" });

    expect(resolveLockedSource([tenth, ninth], tenth)).toBe("IPCC");
  });

  it("anchors on the oldest new row when the group has no persisted one", () => {
    const older = factor({ id: "temp_1758000000000", source: "Propia" });
    const newer = factor({ id: "temp_1758000009999", source: "" });
    const rows = [newer, older];

    expect(resolveLockedSource(rows, newer)).toBe("Propia");
    expect(resolveLockedSource(rows, older)).toBeUndefined();
  });

  it("locks nothing while the anchor has no source yet", () => {
    const anchor = factor({ id: "temp_1758000000000", source: "" });
    const row = factor({ id: "temp_1758000009999", source: "" });

    expect(resolveLockedSource([anchor, row], row)).toBeUndefined();
  });
});
