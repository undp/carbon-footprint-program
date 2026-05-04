/**
 * Pin an "editing row" to the top of a MUI X DataGrid (Community / free tier),
 * regardless of any active column sort or column filter the user has set.
 *
 * ============================================================================
 *  WHY THIS EXISTS
 * ============================================================================
 *
 * When the user clicks "Add row" on a DataGrid backed by a React-Hook-Form
 * `useFieldArray`, a fresh row with empty/default values is inserted into the
 * data and the user enters edit mode immediately. The DataGrid then runs its
 * normal sort / filter / paginate pipeline over the new row, which causes two
 * problems:
 *
 *   1. SORT: the new row's blank fields land it in an unexpected slot of the
 *      sorted list, often far from where the user clicked.
 *   2. FILTER: the new row's blank fields rarely match the user's column
 *      filter, so the DataGrid hides it entirely. The user is then editing a
 *      row they cannot see.
 *
 * The fix below addresses both by transforming the column definitions so that:
 *
 *   - Every sortable column's comparator forces the editing row to compare as
 *     "less than everything else", pinning it to position 0 of the sorted list
 *     in both ascending and descending directions.
 *   - Every filterable column's filter operators short-circuit to `true` for
 *     the editing row, so it always passes whatever filter the user typed.
 *
 * The wrapper is a no-op when no row is being edited and a no-op for the rows
 * that aren't the editing row when one is — i.e. the existing sort/filter UX
 * is preserved for the rest of the data.
 *
 * ============================================================================
 *  WHY THIS APPROACH (vs. alternatives)
 * ============================================================================
 *
 *   - `pinnedRows` would solve this in one line, but it's a Pro-tier feature.
 *   - Controlling `sortModel` / `filterModel` and clearing them on add discards
 *     the user's sort/filter context; rejected as a UX regression.
 *   - Hiding the column-filter UI while editing was the originally-approved
 *     trade-off, but the operator-wrap approach below preserves the UI without
 *     any UX cost.
 *
 * ============================================================================
 *  USAGE
 * ============================================================================
 *
 *   const wrapped = useMemo(() => {
 *     if (editingRowId === null || !columns) return columns;
 *     return columns.map((col) => pinEditingRowColumn(col, editingRowId));
 *   }, [columns, editingRowId]);
 *   return <DataGrid columns={wrapped} ... />;
 */
import {
  getGridBooleanOperators,
  getGridDateOperators,
  getGridNumericOperators,
  getGridSingleSelectOperators,
  getGridStringOperators,
  gridDateComparator,
  gridNumberComparator,
  gridStringOrNumberComparator,
  type GridColDef,
  type GridComparatorFn,
  type GridFilterOperator,
  type GridSortDirection,
  type GridValidRowModel,
} from "@mui/x-data-grid";

/**
 * Per-`col.type` defaults that mirror what the DataGrid resolves internally
 * when a column doesn't set `sortComparator` / `filterOperators` explicitly.
 *
 * We need this because our wrappers replace those fields, so we have to
 * provide a sensible fallback whenever the original column was relying on the
 * grid's own type-based defaults.
 */
type ColTypeDefaults = {
  cmp: GridComparatorFn;
  ops: () => GridFilterOperator[];
};

const STRING_DEFAULTS: ColTypeDefaults = {
  cmp: gridStringOrNumberComparator,
  ops: () => getGridStringOperators() as GridFilterOperator[],
};

const TYPE_DEFAULTS: Record<string, ColTypeDefaults> = {
  number: {
    cmp: gridNumberComparator,
    ops: () => getGridNumericOperators() as GridFilterOperator[],
  },
  boolean: {
    cmp: gridStringOrNumberComparator,
    ops: () => getGridBooleanOperators() as GridFilterOperator[],
  },
  singleSelect: {
    cmp: gridStringOrNumberComparator,
    ops: () => getGridSingleSelectOperators(),
  },
  date: {
    cmp: gridDateComparator,
    ops: () => getGridDateOperators() as GridFilterOperator[],
  },
  dateTime: {
    cmp: gridDateComparator,
    ops: () => getGridDateOperators(true) as GridFilterOperator[],
  },
};

const defaultsFor = (col: GridColDef): ColTypeDefaults =>
  TYPE_DEFAULTS[col.type ?? ""] ?? STRING_DEFAULTS;

/**
 * Mirror the DataGrid's "flip the sign for desc" rule.
 *
 * Why this exists: the grid handles ascending vs descending in two different
 * places. If the column declares `sortComparator`, the grid multiplies its
 * result by -1 for `desc`. If the column declares `getSortComparator(dir)`,
 * the grid uses the returned comparator AS IS — no flipping. We use the
 * `getSortComparator` form below (so we can pin the editing row regardless of
 * direction), which means we must handle desc ourselves when falling back to
 * a plain `sortComparator`.
 */
const directional = (
  cmp: GridComparatorFn,
  dir: GridSortDirection
): GridComparatorFn =>
  dir === "desc" ? (v1, v2, p1, p2) => -cmp(v1, v2, p1, p2) : cmp;

/**
 * Wrap a comparator so the row matching `editingRowId` always sorts to the
 * top, regardless of the underlying values.
 *
 * Returning `-1` whenever the first argument is the editing row, and `+1`
 * whenever the second argument is, places it before everything else. We use
 * this through `getSortComparator` (which returns a direction-aware comparator
 * the grid uses verbatim), so this works for both ascending and descending.
 */
const pinByEditing =
  (cmp: GridComparatorFn, editingRowId: string): GridComparatorFn =>
  (v1, v2, p1, p2) =>
    String(p1.id) === editingRowId
      ? -1
      : String(p2.id) === editingRowId
        ? 1
        : cmp(v1, v2, p1, p2);

/**
 * Wrap a single filter operator so its `apply` predicate returns `true` for
 * the editing row, no matter what the user typed in the column-filter input.
 *
 * `getApplyFilterFn` returns `null` when the current filter input is invalid
 * or empty — in that case we propagate `null` so the grid skips this filter
 * entirely (which already lets every row through, including ours).
 */
const allowEditingRow = (
  op: GridFilterOperator,
  editingRowId: string
): GridFilterOperator => ({
  ...op,
  getApplyFilterFn: (filterItem, column) => {
    const base = op.getApplyFilterFn(filterItem, column);
    if (!base) return null;
    return (value, row, c, apiRef) =>
      (!!row && String((row as { id: string | number }).id) === editingRowId) ||
      base(value, row, c, apiRef);
  },
});

/**
 * Transform a single `GridColDef` so the row identified by `editingRowId`:
 *
 *   - is always sorted to the top of this column (when sorted by it), and
 *   - is always allowed through this column's filter.
 *
 * Columns that explicitly opt out of sorting (`sortable: false`) or filtering
 * (`filterable: false`) are passed through unchanged for that aspect.
 *
 * The function is pure: it returns a new column object, never mutates the
 * input. Wrap inside `useMemo` keyed on `[columns, editingRowId]` to keep
 * referential stability across renders.
 */
export const pinEditingRowColumn = <R extends GridValidRowModel>(
  col: GridColDef<R>,
  editingRowId: string
): GridColDef<R> => {
  const fb = defaultsFor(col as GridColDef);
  return {
    ...col,
    ...(col.sortable !== false && {
      getSortComparator: (dir) =>
        pinByEditing(
          col.getSortComparator?.(dir) ??
            directional(
              (col.sortComparator as GridComparatorFn | undefined) ?? fb.cmp,
              dir
            ),
          editingRowId
        ),
    }),
    ...(col.filterable !== false && {
      filterOperators: (
        (col.filterOperators as GridFilterOperator[] | undefined) ?? fb.ops()
      ).map((op) => allowEditingRow(op, editingRowId)),
    }),
  };
};
