import type { EmissionFactorForm } from "@repo/types";

/**
 * The source a new or edited factor is forced to carry, when the catalogue
 * already fixes one for its group.
 *
 * The group is `(subcategory, year)`, matching `validateSourceConsistency` on
 * the server. Keyed on the subcategory alone the lock reaches across years:
 * adding a 2026 row to a subcategory that already holds 2025 factors would
 * present the 2025 citation and — because `EmissionFactorSourceCell` writes the
 * locked value back into the form — save it silently, over a source the server
 * would have accepted.
 *
 * Returns `undefined` when nothing fixes the source yet, which is what leaves
 * the cell free to be typed. A row with no subcategory or no year yet locks
 * nothing: an incomplete row has no group to belong to.
 */
export const resolveLockedSource = (
  rows: EmissionFactorForm[],
  row: EmissionFactorForm | undefined
): string | undefined => {
  if (!row?.subcategoryId || row.year == null) return undefined;

  return rows.find(
    (candidate) =>
      candidate.id !== row.id &&
      candidate.subcategoryId === row.subcategoryId &&
      candidate.year === row.year
  )?.source;
};
