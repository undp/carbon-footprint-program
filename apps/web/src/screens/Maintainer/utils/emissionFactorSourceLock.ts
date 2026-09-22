import type { EmissionFactorForm } from "@repo/types";

const isPersisted = (id: string) => !id.startsWith("temp_");

/**
 * Orders the rows of a group so the first one is its anchor: the row whose
 * source the rest adopt.
 *
 * Persisted rows come before new ones — their source is already in the
 * catalogue and is what the server will compare against — and ties break by id,
 * compared numerically so `9` precedes `10` and the oldest `temp_<timestamp>`
 * precedes the newer ones. Row order in the grid is deliberately not used: it
 * changes with sorting and pagination, and an anchor that moves is an anchor
 * that rewrites the group every time the maintainer sorts a column.
 */
const compareByAnchorPrecedence = (
  a: EmissionFactorForm,
  b: EmissionFactorForm
): number => {
  if (isPersisted(a.id) !== isPersisted(b.id))
    return isPersisted(a.id) ? -1 : 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
};

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
 * The group's source is resolved through a single anchor rather than through
 * "any other row of the group". Any other row makes the lock mutual: two rows
 * of one group holding different sources each read the other as their lock, so
 * each writes the other's source into its own field, the values swap on every
 * render and neither ever settles. The snackbar follows the swap — the
 * announced replacement alternates between `A→B` and `B→A`, so the guard that
 * silences a repeat never matches. With one anchor per group the anchor itself
 * is free and every other row converges on it in a single pass.
 *
 * Returns `undefined` when nothing fixes the source yet, which is what leaves
 * the cell free to be typed: for the anchor of the group, and when the anchor
 * has no source yet — a blank lock would show a padlock over an empty cell and
 * forbid typing the very value it is waiting for. A row with no subcategory or
 * no year yet locks nothing either: an incomplete row has no group to belong to.
 */
export const resolveLockedSource = (
  rows: EmissionFactorForm[],
  row: EmissionFactorForm | undefined
): string | undefined => {
  if (!row?.subcategoryId || row.year == null) return undefined;

  const [anchor] = rows
    .filter(
      (candidate) =>
        candidate.subcategoryId === row.subcategoryId &&
        candidate.year === row.year
    )
    .sort(compareByAnchorPrecedence);

  if (!anchor || anchor.id === row.id) return undefined;

  return anchor.source || undefined;
};
