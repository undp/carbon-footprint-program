import { useMemo } from "react";
import { Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { formatQuantity } from "@/utils/formatting";

type LineRow =
  GetEmissionsSummaryFullResponse["categories"][number]["subcategories"][number]["lines"][number];

export const useSubcategoryLinesColumns = (
  color: string
): GridColDef<LineRow>[] => {
  return useMemo(
    () => [
      {
        field: "emissionSource",
        headerName: "Fuente de emisión",
        minWidth: 180,
        flex: 1.3,
        cellClassName: "content-center",
      },
      {
        field: "measurementUnitName",
        headerName: "Unidad",
        minWidth: 100,
        flex: 0.8,
        cellClassName: "content-center",
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "quantity",
        headerName: "Cantidad",
        minWidth: 100,
        flex: 0.8,
        headerAlign: "right",
        align: "right",
        cellClassName: "content-center",
        valueFormatter: (value: number | null) =>
          value != null ? formatQuantity(value) : "-",
      },
      {
        field: "factorValue",
        headerName: "Factor kgCO₂e/unidad",
        minWidth: 150,
        flex: 1,
        headerAlign: "right",
        align: "right",
        cellClassName: "content-center ",
        valueFormatter: (value: number | null) =>
          value != null
            ? value.toLocaleString("es-CL", { maximumFractionDigits: 4 })
            : "-",
      },
      {
        field: "factorSource",
        headerName: "Fuente factor",
        minWidth: 130,
        flex: 1.2,
        headerAlign: "center",
        align: "center",
        cellClassName: "content-center",
        valueFormatter: (value: string | null) => value ?? "-",
      },
      {
        field: "emissions",
        headerName: "Emisiones tCO₂e",
        minWidth: 130,
        flex: 0.8,
        cellClassName: "content-center",
        headerAlign: "right",
        align: "right",
        renderCell: ({ row }) => (
          <Typography variant="body2" sx={{ color, fontSize: "0.75rem" }}>
            {row.emissions.toLocaleString("es-CL", {
              maximumFractionDigits: 2,
            })}
          </Typography>
        ),
      },
    ],
    [color]
  );
};
