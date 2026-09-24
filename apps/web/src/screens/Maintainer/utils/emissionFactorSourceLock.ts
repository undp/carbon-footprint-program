import type { EmissionFactorForm } from "@repo/types";

type PersistedFactor = Pick<
  EmissionFactorForm,
  "id" | "subcategoryId" | "year" | "source"
>;

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
 * The lock reads the **persisted** factors, the server's rows, never the form.
 * Every row with at least one persisted sibling in its group is locked, and the
 * value is the group's persisted source. Two earlier readings failed:
 *  - "any other row" of the form made the lock mutual. Two rows of one group
 *    holding different sources each read the other as their lock and wrote it
 *    into their own field, so the values swapped on every render and never
 *    settled.
 *  - an anchor — the lowest persisted id, left free — stopped the swap but left
 *    that row editable. What the admin typed into it reached its siblings
 *    through the same write-back and ended in a 409, since the server still
 *    held the old source for them. And a low-id row moved into another year
 *    became that group's anchor, imposing its source instead of adopting the
 *    group's.
 * Persisted values do not move while the form is edited, and the server keeps
 * one source per group, so there is nothing to swap and no anchor to need. A
 * row moved to another year adopts its destination group's source, because its
 * own persisted entry still sits in the group it left.
 *
 * The group's source is taken from its lowest id. On a consistent group every
 * row agrees and the choice does not matter; on one left inconsistent by older
 * data it keeps every row converging on the same value instead of trading.
 *
 * Returns `undefined` when nothing fixes the source yet, which leaves the cell
 * free to be typed: a group with no persisted sibling — only new rows, whose
 * first save is what fixes the source — or a row with no subcategory or no year
 * yet, which has no group to belong to.
 */
export const resolveLockedSource = (
  persistedRows: PersistedFactor[],
  // A form row: its year is `null` until the admin chooses one.
  row:
    | (Pick<EmissionFactorForm, "id" | "subcategoryId"> & {
        year: number | null;
      })
    | undefined
): string | undefined => {
  if (!row?.subcategoryId || row.year == null) return undefined;

  const group = persistedRows
    .filter(
      (candidate) =>
        candidate.subcategoryId === row.subcategoryId &&
        candidate.year === row.year
    )
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  if (!group.some((candidate) => candidate.id !== row.id)) return undefined;

  return group[0].source || undefined;
};
