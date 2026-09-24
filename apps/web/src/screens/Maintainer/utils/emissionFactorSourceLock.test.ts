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
  it("locks nothing when the group has no persisted sibling", () => {
    const row = factor({ id: "1" });

    expect(resolveLockedSource([row], row)).toBeUndefined();
  });

  it("takes the source of a persisted sibling of the same subcategory and year", () => {
    const persisted = [factor({ id: "1", source: "IPCC" })];
    const row = factor({ id: "temp_1758000000000", source: "" });

    expect(resolveLockedSource(persisted, row)).toBe("IPCC");
  });

  it("does not reach across years", () => {
    const persisted = [factor({ id: "1", source: "DEFRA 2025", year: 2025 })];
    const row = factor({ id: "2", source: "DEFRA 2026", year: 2026 });

    expect(resolveLockedSource(persisted, row)).toBeUndefined();
  });

  it("does not reach across subcategories", () => {
    const persisted = [factor({ id: "1", subcategoryId: "sub-2" })];
    const row = factor({ id: "2", source: "" });

    expect(resolveLockedSource(persisted, row)).toBeUndefined();
  });

  it("locks nothing while the row has no subcategory yet", () => {
    const persisted = [factor({ id: "1", source: "IPCC" })];
    const row = factor({ id: "2", subcategoryId: "", source: "" });

    expect(resolveLockedSource(persisted, row)).toBeUndefined();
  });

  it("locks every row that has a persisted sibling, the lowest id included", () => {
    // The anchor version left row 5 editable: what the admin typed into it
    // reached rows 7 and 9 through the write-back and ended in a 409.
    const persisted = [
      factor({ id: "5", source: "DEFRA 2025" }),
      factor({ id: "7", source: "DEFRA 2025" }),
      factor({ id: "9", source: "DEFRA 2025" }),
    ];

    for (const row of persisted)
      expect(resolveLockedSource(persisted, row)).toBe("DEFRA 2025");
  });

  it("ignores a draft typed into a sibling", () => {
    // Only persisted rows are read, so an unsaved edit of row 5 cannot move
    // the lock of row 7 — the write-back has nothing new to copy.
    const persisted = [
      factor({ id: "5", source: "DEFRA 2025" }),
      factor({ id: "7", source: "DEFRA 2025" }),
    ];
    const draftOfSeven = factor({ id: "7", source: "Borrador" });

    expect(resolveLockedSource(persisted, draftOfSeven)).toBe("DEFRA 2025");
  });

  it("makes a row moved to another year adopt the group it joins", () => {
    // Row 3 has the lowest id. Under the anchor it became the 2026 group's
    // anchor and imposed "IPCC" on it; its persisted entry still sits in 2025,
    // so it now reads the 2026 group's source instead.
    const persisted = [
      factor({ id: "3", source: "IPCC", year: 2025 }),
      factor({ id: "8", source: "DEFRA 2026", year: 2026 }),
    ];
    const movedRow = factor({ id: "3", source: "IPCC", year: 2026 });

    expect(resolveLockedSource(persisted, movedRow)).toBe("DEFRA 2026");
    // Row 8 is still the only persisted row of 2026, so it stays free: the
    // move has not been saved, and nothing it types reaches row 3's lock.
    expect(resolveLockedSource(persisted, persisted[1])).toBeUndefined();
  });

  it("converges an inconsistent persisted group on one value instead of swapping", () => {
    // The swap that looped: two rows of one group, two sources. Both now read
    // the same value, so the write-back settles after one pass.
    const persisted = [
      factor({ id: "10", source: "DEFRA 2025" }),
      factor({ id: "9", source: "IPCC" }),
    ];

    expect(resolveLockedSource(persisted, persisted[0])).toBe("IPCC");
    expect(resolveLockedSource(persisted, persisted[1])).toBe("IPCC");
  });

  it("leaves a group of new rows free", () => {
    const row = factor({ id: "temp_1758000009999", source: "" });

    expect(resolveLockedSource([], row)).toBeUndefined();
  });
});
