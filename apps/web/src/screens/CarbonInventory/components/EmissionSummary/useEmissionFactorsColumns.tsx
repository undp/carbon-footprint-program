import { useMemo } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { WarningAmberRounded } from "@mui/icons-material";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { CategoryChip } from "@/components/EmissionResults";
import { DetailTooltipText } from "@/components";
import { formatter } from "@/utils/formatting";

const extractDenominator = (rateUnit: string): string => {
  const parts = rateUnit.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : rateUnit;
};

export const useEmissionFactorsColumns = (
  inventoryYear: number | null
): GridColDef<GetEmissionFactorsResponse[number]>[] => {
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
        field: "factorValue",
        headerName: "Factor (Kg CO₂e/unidad)",
        minWidth: 180,
        headerClassName,
        cellClassName,
        flex: 1.2,
        renderCell: ({ row, tabIndex }) => {
          const denominator = extractDenominator(row.rateUnit);
          // Same audit affordance as the capture grid, under the same rule: the
          // cell shows the rounded factor and the tooltip the value the
          // emissions come from, but only when that rounding actually hides
          // digits. The per-gas breakdown below inherits the precision and not
          // the affordance — those values are not the number users reconcile.
          const displayedFactor = formatter.emissionFactor(row.factorValue);
          const exactFactor = formatter.exact(row.factorValue);
          const exactValueDetail =
            displayedFactor === exactFactor
              ? ""
              : `Valor usado en el cálculo: ${exactFactor} ${row.rateUnit}`;
          return (
            <Box className="flex flex-col gap-0.5">
              <DetailTooltipText
                detail={exactValueDetail}
                tabIndex={tabIndex}
                variant="body2"
                fontWeight="fontWeightRegular"
              >
                {displayedFactor} {row.rateUnit}
              </DetailTooltipText>
              {row.gasBreakdownLines.map((line, idx) => (
                <Typography
                  key={idx}
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.65rem" }}
                >
                  {formatter.emissionFactor(line.value)} kg CO₂e of {line.gas}/
                  {denominator}
                </Typography>
              ))}
            </Box>
          );
        },
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
      {
        field: "appliedFactorYear",
        headerName: "Año del factor",
        minWidth: 130,
        headerClassName,
        cellClassName,
        flex: 0.7,
        renderCell: ({ row }) => {
          // A null applied year is a transversal catalog factor or a custom
          // factor. Neither has a vintage to disagree with the footprint year,
          // so neither is ever styled as a mismatch.
          if (row.appliedFactorYear === null) {
            return (
              <Tooltip
                title="Factor transversal o propio: aplica a cualquier año de reporte."
                arrow
                placement="top"
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontWeight="fontWeightRegular"
                >
                  —
                </Typography>
              </Tooltip>
            );
          }

          const isMismatch =
            inventoryYear !== null && row.appliedFactorYear !== inventoryYear;

          if (!isMismatch) {
            return (
              <Typography variant="body2" fontWeight="fontWeightRegular">
                {row.appliedFactorYear}
              </Typography>
            );
          }

          return (
            <Tooltip
              title={`Este factor corresponde al año ${row.appliedFactorYear}, distinto del año ${inventoryYear} de la huella. El cálculo no fue modificado.`}
              arrow
              placement="top"
            >
              <Box className="flex items-center gap-1">
                <WarningAmberRounded fontSize="small" color="warning" />
                <Typography
                  variant="body2"
                  color="warning.dark"
                  fontWeight="fontWeightMedium"
                >
                  {row.appliedFactorYear}
                </Typography>
              </Box>
            </Tooltip>
          );
        },
      },
    ],
    [inventoryYear]
  );
};
