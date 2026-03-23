import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { CategoryChip } from "../CategoryChip";

export const useEmissionFactorsColumns = (): GridColDef<
  GetEmissionFactorsResponse[number]
>[] => {
  const cellClassName = "content-center p-4!";

  const headerClassName =
    "p-4! bg-foreground/[0.03] text-foreground font-semibold text-sm";

  return useMemo<GridColDef<GetEmissionFactorsResponse[number]>[]>(
    () => [
      {
        field: "categoryName",
        headerName: "Categoría / Alcance",
        minWidth: 180,
        headerClassName,
        cellClassName,
        flex: 1.2,
        renderCell: ({ row }) => (
          <Box className="flex flex-col items-start gap-1">
            <CategoryChip
              label={row.categorySynonyms ?? ""}
              categoryColor={row.categoryColor}
              sx={{
                fontSize: "8px",
                height: "16px",
                "& .MuiChip-label": { px: 1 },
              }}
            />
            <Typography variant="body2" fontWeight="fontWeightRegular">
              {row.categoryName}
            </Typography>
          </Box>
        ),
      },
      {
        field: "subcategoryName",
        headerName: "Sub-categoría",
        minWidth: 150,
        headerClassName,
        cellClassName,
        flex: 1,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontWeight="fontWeightRegular">
            {row.subcategoryName}
          </Typography>
        ),
      },
      {
        field: "activityParameter",
        headerName: "Parámetros de actividad",
        minWidth: 150,
        headerClassName,
        cellClassName,
        flex: 1,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontWeight="fontWeightRegular">
            {row.activityParameter}
          </Typography>
        ),
      },
      {
        field: "factorLabel",
        headerName: "Factor (Kg CO₂e/unidad)",
        minWidth: 180,
        headerClassName,
        cellClassName,
        flex: 1.2,
        renderCell: ({ row }) => (
          <Box className="flex flex-col gap-0.5">
            <Typography variant="body2" fontWeight="fontWeightRegular">
              {row.factorLabel}
            </Typography>
            {row.gasBreakdownLines.map((line, idx) => (
              <Typography
                key={idx}
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: "0.65rem" }}
              >
                {line}
              </Typography>
            ))}
          </Box>
        ),
      },
      {
        field: "factorSource",
        headerName: "Fuente",
        minWidth: 150,
        headerClassName,
        cellClassName,
        flex: 1,
        renderCell: ({ row }) => (
          <Box className="flex flex-col">
            <Typography variant="body2" fontWeight="fontWeightRegular">
              {row.factorSource}
            </Typography>
            {row.factorSourceDetail && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic", fontSize: "0.65rem" }}
              >
                {row.factorSourceDetail}
              </Typography>
            )}
          </Box>
        ),
      },
    ],
    []
  );
};
