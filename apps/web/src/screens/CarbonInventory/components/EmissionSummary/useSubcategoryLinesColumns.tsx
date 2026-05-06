import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { formatter } from "@/utils/formatting";

type LineRow =
  GetEmissionsDetailedSummaryResponse["categories"][number]["subcategories"][number]["lines"][number];

export const useSubcategoryLinesColumns = (): GridColDef<LineRow>[] => {
  const cellClassName = "content-center px-2! py-0! h-6! text-sm";

  const headerClassName = "px-2! py-1! font-semibold text-sm";

  return useMemo<GridColDef<LineRow>[]>(
    () => [
      {
        field: "emissionSource",
        headerName: "Fuente de emisión",
        minWidth: 180,
        flex: 1.3,
        headerClassName,
        cellClassName,
      },
      {
        field: "measurementUnitName",
        headerName: "Unidad",
        minWidth: 100,
        flex: 0.8,
        headerClassName,
        cellClassName,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "quantity",
        headerName: "Cantidad",
        minWidth: 100,
        flex: 0.8,
        headerAlign: "right",
        align: "right",
        headerClassName,
        cellClassName,
        valueFormatter: (value: number | null) => formatter.quantity(value),
      },
      {
        field: "factorValue",
        headerName: "Factor kgCO₂e/unidad",
        minWidth: 150,
        flex: 1,
        headerAlign: "right",
        align: "right",
        headerClassName,
        cellClassName,
        valueFormatter: (value: number | null) =>
          formatter.emissionFactor(value),
      },
      {
        field: "factorSource",
        headerName: "Fuente factor",
        minWidth: 130,
        flex: 1.2,
        headerAlign: "center",
        align: "center",
        headerClassName,
        cellClassName,
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "emissions",
        headerName: "Emisiones (tCO₂e)",
        minWidth: 130,
        flex: 0.8,
        headerClassName,
        cellClassName,
        headerAlign: "right",
        align: "right",
        valueFormatter: (value: number | null) =>
          formatter.emissions(value, { withSuffix: false }),
      },
    ],
    []
  );
};
