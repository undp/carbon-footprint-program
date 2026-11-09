import { useMemo } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import { YearCopyOutcome } from "@repo/utils";
import type { YearCopyRow } from "../utils/emissionFactorYearCopy";
import { YearCopySourceValueCell } from "../components/emissionFactorYearCopy/YearCopySourceValueCell";
import { YearCopyTargetSourceCell } from "../components/emissionFactorYearCopy/YearCopyTargetSourceCell";
import { YearCopyTargetValueCell } from "../components/emissionFactorYearCopy/YearCopyTargetValueCell";
import { YearCopyRowActionCell } from "../components/emissionFactorYearCopy/YearCopyRowActionCell";

interface Params {
  sourceYear: number;
  targetYear: number;
  subcategoryNames: readonly string[];
  /** The dimension names when one subcategory is filtered, else generic. */
  dimensionHeaders: { dim1: string; dim2: string };
  sourceSuggestions: readonly string[];
  onValueChange: (row: YearCopyRow, value: number | null) => void;
  onSourceChange: (row: YearCopyRow, source: string) => void;
  onToggleExclude: (row: YearCopyRow) => void;
}

/** What the target source column searches and sorts by. */
const targetSourceText = (row: YearCopyRow): string =>
  row.outcome === YearCopyOutcome.EXISTS_IN_TARGET
    ? row.targetFactors.map((factor) => factor.source).join(", ")
    : row.sourceInput;

export const useYearCopyColumns = ({
  sourceYear,
  targetYear,
  subcategoryNames,
  dimensionHeaders,
  sourceSuggestions,
  onValueChange,
  onSourceChange,
  onToggleExclude,
}: Params): GridColDef<YearCopyRow>[] =>
  useMemo(
    () => [
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        type: "singleSelect",
        valueOptions: [...subcategoryNames],
        flex: 1.3,
        minWidth: 160,
      },
      {
        field: "dimensionValue1Name",
        headerName: dimensionHeaders.dim1,
        flex: 1,
        minWidth: 120,
        valueGetter: (value: string | null) => value ?? "",
      },
      {
        field: "dimensionValue2Name",
        headerName: dimensionHeaders.dim2,
        flex: 1,
        minWidth: 120,
        valueGetter: (value: string | null) => value ?? "",
      },
      {
        field: "rateUnitName",
        headerName: "Unidad",
        flex: 0.8,
        minWidth: 90,
      },
      {
        field: "storedSource",
        headerName: `Fuente ${sourceYear}`,
        flex: 1,
        minWidth: 120,
      },
      {
        field: "targetSource",
        headerName: `Fuente ${targetYear}`,
        flex: 1.3,
        minWidth: 170,
        valueGetter: (_value, row) => targetSourceText(row),
        renderCell: ({ row }) => (
          <YearCopyTargetSourceCell
            row={row}
            targetYear={targetYear}
            suggestions={sourceSuggestions}
            onChange={onSourceChange}
          />
        ),
      },
      {
        field: "storedValue",
        headerName: `Valor ${sourceYear}`,
        type: "number",
        flex: 1,
        minWidth: 140,
        renderCell: ({ row }) => (
          <YearCopySourceValueCell
            row={row}
            sourceYear={sourceYear}
            targetYear={targetYear}
          />
        ),
      },
      {
        field: "targetValue",
        headerName: `Valor ${targetYear}`,
        type: "number",
        flex: 1,
        minWidth: 140,
        renderCell: ({ row }) => (
          <YearCopyTargetValueCell row={row} onChange={onValueChange} />
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 56,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: ({ row }) => (
          <YearCopyRowActionCell
            row={row}
            targetYear={targetYear}
            onToggleExclude={onToggleExclude}
          />
        ),
      },
    ],
    [
      sourceYear,
      targetYear,
      subcategoryNames,
      dimensionHeaders,
      sourceSuggestions,
      onValueChange,
      onSourceChange,
      onToggleExclude,
    ]
  );
