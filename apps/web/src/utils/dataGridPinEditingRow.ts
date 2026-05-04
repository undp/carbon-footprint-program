// Pin an "editing row" to the top of a MUI X DataGrid (Community tier),
// regardless of any active column sort or column filter.
// See docs/development/datagrid.md for the full rationale.
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

// The grid flips the sign of `sortComparator` for desc but uses the result of
// `getSortComparator(dir)` verbatim. We use the latter form, so we have to
// flip ourselves when falling back to a plain `sortComparator`.
const directional = (
  cmp: GridComparatorFn,
  dir: GridSortDirection
): GridComparatorFn =>
  dir === "desc" ? (v1, v2, p1, p2) => -cmp(v1, v2, p1, p2) : cmp;

const pinByEditing =
  (cmp: GridComparatorFn, editingRowId: string): GridComparatorFn =>
  (v1, v2, p1, p2) => {
    const p1IsEditing = String(p1.id) === editingRowId;
    const p2IsEditing = String(p2.id) === editingRowId;
    if (p1IsEditing && p2IsEditing) return 0;
    if (p1IsEditing) return -1;
    if (p2IsEditing) return 1;
    return cmp(v1, v2, p1, p2);
  };

// `getApplyFilterFn` returns null for invalid/empty input — propagate it so
// the grid skips the filter entirely (which already lets every row through).
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
