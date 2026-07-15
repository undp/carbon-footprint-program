import { describe, expect, it } from "vitest";
import type {
  GridColDef,
  GridComparatorFn,
  GridFilterItem,
  GridSortCellParams,
  GridSortDirection,
} from "@mui/x-data-grid";
import { pinEditingRowColumn } from "./dataGridPinEditingRow";

const EDITING_ID = "42";
const OTHER_ID = "7";

// The pinned comparator only reads `.id` off the cell params, so a light shim is
// enough — the rest of GridSortCellParams is never touched by the code path.
const cellParams = (id: string | number): GridSortCellParams =>
  ({ id }) as unknown as GridSortCellParams;

// The wrapped filter fn is called with (value, row, column, apiRef); our
// assertions only need the first two, and the trailing args are unused at
// runtime, so a 2-arg shape keeps the tests readable.
type RowFilterFn = (value: unknown, row: unknown) => boolean;

const getPinnedSort = (
  col: GridColDef,
  dir: GridSortDirection
): GridComparatorFn => {
  const { getSortComparator } = pinEditingRowColumn(col, EDITING_ID);
  if (!getSortComparator) {
    throw new Error("expected a sort comparator on a sortable column");
  }
  const comparator = getSortComparator(dir);
  if (!comparator) {
    throw new Error("expected getSortComparator to return a comparator");
  }
  return comparator;
};

const applyFilter = (
  col: GridColDef,
  item: GridFilterItem
): RowFilterFn | null => {
  const [op] = pinEditingRowColumn(col, EDITING_ID).filterOperators ?? [];
  if (!op) {
    throw new Error("expected at least one filter operator");
  }
  return op.getApplyFilterFn(item, col) as unknown as RowFilterFn | null;
};

// Column with a custom `sortComparator` and no `getSortComparator`: exercises the
// `directional(col.sortComparator ?? fb.cmp)` branch and desc sign-flipping.
const numericCol: GridColDef = {
  field: "n",
  sortComparator: (a, b) => Number(a) - Number(b),
};

// Column with its own `getSortComparator`: it must win over `sortComparator`.
const getSortComparatorCol: GridColDef = {
  field: "n",
  sortComparator: () => 999, // sentinel that must never be used
  getSortComparator: (dir) => (a, b) =>
    dir === "asc" ? Number(a) - Number(b) : Number(b) - Number(a),
};

// Custom filter operator whose base returns null for empty input and an
// equality check otherwise — lets us drive both `allowEditingRow` branches.
const customFilterCol: GridColDef = {
  field: "name",
  filterOperators: [
    {
      value: "equals",
      getApplyFilterFn: (filterItem) => {
        if (!filterItem.value) return null;
        return (value) => value === filterItem.value;
      },
    },
  ],
};

const filterItem = (value: unknown): GridFilterItem => ({
  field: "name",
  operator: "equals",
  value,
});

describe("pinEditingRowColumn — pins the editing row to the top", () => {
  it.each<{ name: string; p1: string; p2: string; expected: number }>([
    {
      name: "both rows are the editing row → equal",
      p1: EDITING_ID,
      p2: EDITING_ID,
      expected: 0,
    },
    {
      name: "first row is the editing row → sorts first",
      p1: EDITING_ID,
      p2: OTHER_ID,
      expected: -1,
    },
    {
      name: "second row is the editing row → sorts first",
      p1: OTHER_ID,
      p2: EDITING_ID,
      expected: 1,
    },
  ])("$name", ({ p1, p2, expected }) => {
    const cmp = getPinnedSort(numericCol, "asc");
    // Underlying values (1 vs 2) are irrelevant while a row is being edited.
    expect(cmp(1, 2, cellParams(p1), cellParams(p2))).toBe(expected);
  });

  it("matches the editing row by string-coercing a numeric row id", () => {
    const cmp = getPinnedSort(numericCol, "asc");
    expect(cmp(1, 2, cellParams(42), cellParams(7))).toBe(-1);
    expect(cmp(1, 2, cellParams(7), cellParams(42))).toBe(1);
  });

  it("keeps the editing row pinned to the top even when sorting descending", () => {
    const cmp = getPinnedSort(numericCol, "desc");
    expect(cmp(1, 2, cellParams(EDITING_ID), cellParams(OTHER_ID))).toBe(-1);
    expect(cmp(1, 2, cellParams(OTHER_ID), cellParams(EDITING_ID))).toBe(1);
  });
});

describe("pinEditingRowColumn — sorting of non-editing rows", () => {
  it("delegates to the column comparator when neither row is being edited", () => {
    const cmp = getPinnedSort(numericCol, "asc");
    expect(cmp(1, 2, cellParams("1"), cellParams("2"))).toBeLessThan(0);
    expect(cmp(2, 1, cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
    expect(cmp(1, 1, cellParams("1"), cellParams("2"))).toBe(0);
  });

  it("flips the comparator sign for descending (directional)", () => {
    const asc = getPinnedSort(numericCol, "asc");
    const desc = getPinnedSort(numericCol, "desc");
    expect(asc(1, 2, cellParams("1"), cellParams("2"))).toBeLessThan(0);
    expect(desc(1, 2, cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
  });

  it("prefers col.getSortComparator over col.sortComparator", () => {
    // A `999` result would mean the sentinel sortComparator leaked through.
    const asc = getPinnedSort(getSortComparatorCol, "asc");
    expect(asc(1, 2, cellParams("1"), cellParams("2"))).toBeLessThan(0);
    expect(asc(2, 1, cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
  });

  it("lets col.getSortComparator own the direction (no extra flip applied)", () => {
    const desc = getPinnedSort(getSortComparatorCol, "desc");
    expect(desc(1, 2, cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
    expect(desc(2, 1, cellParams("1"), cellParams("2"))).toBeLessThan(0);
  });
});

describe("pinEditingRowColumn — default comparator by column type", () => {
  it("orders numeric columns numerically", () => {
    const cmp = getPinnedSort({ field: "n", type: "number" }, "asc");
    expect(cmp(1, 2, cellParams("1"), cellParams("2"))).toBeLessThan(0);
    expect(cmp(2, 1, cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
  });

  it("orders untyped columns as strings/numbers", () => {
    const cmp = getPinnedSort({ field: "s" }, "asc");
    expect(cmp("a", "b", cellParams("1"), cellParams("2"))).toBeLessThan(0);
    expect(cmp("b", "a", cellParams("1"), cellParams("2"))).toBeGreaterThan(0);
  });

  it("orders date columns chronologically", () => {
    const cmp = getPinnedSort({ field: "d", type: "date" }, "asc");
    const earlier = new Date("2020-01-01T00:00:00.000Z");
    const later = new Date("2021-01-01T00:00:00.000Z");
    expect(cmp(earlier, later, cellParams("1"), cellParams("2"))).toBeLessThan(
      0
    );
    expect(
      cmp(later, earlier, cellParams("1"), cellParams("2"))
    ).toBeGreaterThan(0);
  });
});

describe("pinEditingRowColumn — default filter operators by column type", () => {
  const types: GridColDef["type"][] = [
    undefined,
    "number",
    "boolean",
    "singleSelect",
    "date",
    "dateTime",
  ];

  it.each(types)("wraps the default filter operators for type=%s", (type) => {
    const col: GridColDef = { field: "c", type };
    const { filterOperators } = pinEditingRowColumn(col, EDITING_ID);
    expect(filterOperators).toBeDefined();
    expect(filterOperators?.length).toBeGreaterThan(0);
    for (const op of filterOperators ?? []) {
      expect(typeof op.getApplyFilterFn).toBe("function");
    }
  });
});

describe("pinEditingRowColumn — respects sortable / filterable flags", () => {
  it("does not attach a sort comparator when the column is not sortable", () => {
    const pinned = pinEditingRowColumn(
      { field: "x", sortable: false },
      EDITING_ID
    );
    expect(pinned.getSortComparator).toBeUndefined();
  });

  it("does not attach filter operators when the column is not filterable", () => {
    const pinned = pinEditingRowColumn(
      { field: "x", filterable: false },
      EDITING_ID
    );
    expect(pinned.filterOperators).toBeUndefined();
  });

  it("attaches both by default and preserves the original column fields", () => {
    const pinned = pinEditingRowColumn(
      { field: "name", headerName: "Nombre" },
      EDITING_ID
    );
    expect(pinned.getSortComparator).toBeDefined();
    expect(pinned.filterOperators).toBeDefined();
    expect(pinned.field).toBe("name");
    expect(pinned.headerName).toBe("Nombre");
  });
});

describe("pinEditingRowColumn — filter always lets the editing row through", () => {
  it("propagates null (skip filtering) when the base operator returns null", () => {
    // Empty value → base getApplyFilterFn returns null → wrapper returns null.
    expect(applyFilter(customFilterCol, filterItem(""))).toBeNull();
  });

  it("keeps the editing row visible even when its value fails the filter", () => {
    const fn = applyFilter(customFilterCol, filterItem("foo"));
    expect(fn).not.toBeNull();
    expect(fn?.("bar", { id: EDITING_ID })).toBe(true);
  });

  it("matches the editing row by string-coercing a numeric row id", () => {
    const fn = applyFilter(customFilterCol, filterItem("foo"));
    expect(fn?.("bar", { id: 42 })).toBe(true);
  });

  it("applies the base filter for non-editing rows", () => {
    const fn = applyFilter(customFilterCol, filterItem("foo"));
    expect(fn?.("foo", { id: OTHER_ID })).toBe(true);
    expect(fn?.("bar", { id: OTHER_ID })).toBe(false);
  });

  it("falls back to the base filter when the row is null or undefined", () => {
    const fn = applyFilter(customFilterCol, filterItem("foo"));
    expect(fn?.("foo", null)).toBe(true);
    expect(fn?.("bar", undefined)).toBe(false);
  });
});
