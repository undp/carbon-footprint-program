# DataGrid

This project uses [MUI X DataGrid](https://mui.com/x/react-data-grid/) for tabular data: maintainer admin tables, organization listings, transparency views, emission editors, recognitions, drafts, etc.

## We use the Community (free) tier

We use `@mui/x-data-grid` — the open-source build. We deliberately do **not** depend on `@mui/x-data-grid-pro` or `@mui/x-data-grid-premium`, because Huella Latam is a digital public good distributed to country deployments and we cannot require commercial licenses from adopters.

Practical consequences:

- No `pinnedRows`, no row grouping, no tree data, no aggregation, no Excel export, no clipboard paste.
- We work around missing features in user-land (see `pinEditingRowColumn` below) instead of upgrading the tier.
- When proposing a DataGrid feature, check that it exists in the Community plan first. Pro/Premium-only props will silently be ignored at runtime.

## Project wrappers

We never instantiate `<DataGrid />` directly inside a screen. Two wrappers layer the defaults the project relies on:

### `StylizedDataGrid` (`apps/web/src/components/StylizedDataGrid.tsx`)

Base wrapper used by every grid. It centralizes:

- **Locale**: every visible string (`noRowsLabel`, pagination text, filter operators, toolbar labels) is translated to Spanish here. There is no i18n library in the project, so this wrapper is the single source of Spanish DataGrid copy.
- **Default props**: `hideFooter`, `disableColumnResize`, `disableColumnSorting`, `disableColumnMenu`, `disableColumnFilter`, `disableColumnSelector`, `disableRowSelectionOnClick`, `checkboxSelection={false}`, `getRowHeight={() => "auto"}`, `ignoreDiacritics`. Screens that need any of these enabled re-enable them explicitly via props.
- **Styling**: rounded borders, removed column separators, suppressed focus outlines, neutralized hover background, fixed overlay height. Screens can extend (not replace) these via `sx` — the wrapper merges arrays.
- **Loading overlay**: `loadingOverlay` is set to the `skeleton` variant by default for both loading and no-rows states.

**Use `StylizedDataGrid` for any read-only or non-editable grid.**

### `MaintainerDataGrid` (`apps/web/src/screens/Maintainer/components/MaintainerDataGrid.tsx`)

Wraps `StylizedDataGrid` and adds the behavior every admin maintainer screen needs:

- **Editing-row pinning**: takes an `editingRowId` prop and, when set, transforms each column with `pinEditingRowColumn` so the row stays at the top and visible regardless of sort/filter (see next section).
- **Editing-row highlight**: applies the `row--editing` class so the active row is visually distinct.
- **Optional fuzzy search**: when `searchable` is provided, swaps the default toolbar for `MaintainerToolbar` and runs results through `useFuzzySearch` (Fuse.js). The active editing row is force-included in results so the user never loses sight of it mid-edit.
- **Maintainer styling**: grey column headers, max cell height (default 100px), white background for inputs/selects inside cells.

**Use `MaintainerDataGrid` whenever a screen has inline row editing backed by a React-Hook-Form `useFieldArray`.**

## Pinning the editing row

The Community DataGrid has no `pinnedRows`. We need pinning anyway because of how inline editing works in our maintainer screens.

### The problem

When the user clicks **Add row** on a grid backed by `useFieldArray`, a fresh row with empty/default values is inserted into the data and the user enters edit mode immediately. The grid then runs its normal sort / filter / paginate pipeline over the new row, which causes two problems:

1. **Sort**: the new row's blank fields land it in an unexpected slot of the sorted list, often far from where the user clicked.
2. **Filter**: the new row's blank fields rarely match the user's column filter, so the grid hides it entirely. The user is then editing a row they cannot see.

### The fix: `pinEditingRowColumn`

Implemented in `apps/web/src/utils/dataGridPinEditingRow.ts` and applied automatically by `MaintainerDataGrid`. It transforms each column definition so that:

- Every sortable column's comparator forces the editing row to compare as "less than everything else", pinning it to position 0 in both ascending and descending directions.
- Every filterable column's filter operators short-circuit to `true` for the editing row, so it always passes whatever filter the user typed.

The wrapper is a no-op when no row is being edited, and a no-op for rows that are not the editing row when one is — i.e. the existing sort/filter UX is preserved for the rest of the data. Columns that opt out of sorting (`sortable: false`) or filtering (`filterable: false`) are passed through unchanged for that aspect.

### Why this approach (vs. alternatives)

- **`pinnedRows`** would solve this in one line, but it is a Pro-tier feature and we are committed to the Community build.
- **Controlling `sortModel` / `filterModel` and clearing them on add** discards the user's sort/filter context; rejected as a UX regression.
- **Hiding the column-filter UI while editing** was the originally-approved trade-off, but the operator-wrap approach preserves the UI without any UX cost.

### Implementation notes

- **Type-based defaults**: when a column doesn't set `sortComparator` / `filterOperators` explicitly, the grid resolves them from `col.type` internally. The helper mirrors those defaults (`TYPE_DEFAULTS`) so wrapping doesn't break columns that relied on them.
- **Direction handling**: the grid handles asc/desc in two different places. With `sortComparator` it multiplies the result by `-1` for `desc`; with `getSortComparator(dir)` it uses the returned comparator as-is. The helper uses the `getSortComparator` form (so it can pin the editing row regardless of direction) and handles `desc` itself when falling back to a plain `sortComparator`.
- **Invalid filter inputs**: `getApplyFilterFn` returns `null` when the filter input is invalid or empty — the wrapper propagates `null` so the grid skips that filter entirely (which already lets every row through, including the editing one).
- **Purity**: `pinEditingRowColumn` returns a new column object and never mutates the input. Wrap calls inside `useMemo` keyed on `[columns, editingRowId]` to keep referential stability across renders. `MaintainerDataGrid` already does this internally.

### Manual usage (outside `MaintainerDataGrid`)

If a screen builds its own grid but still needs editing-row pinning:

```tsx
const wrapped = useMemo(() => {
  if (editingRowId === null || !columns) return columns;
  return columns.map((col) => pinEditingRowColumn(col, editingRowId));
}, [columns, editingRowId]);

return <StylizedDataGrid columns={wrapped} ... />;
```
