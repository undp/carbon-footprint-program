import { useMemo } from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import type { GetAllRateMeasurementUnitsResponse } from "@repo/types";

type RateMeasurementUnit = GetAllRateMeasurementUnitsResponse[number];

const REFERENCE_COUNT_LABELS = {
  emissionFactors: "Factores de emisión",
  lineInputsAsManualFactor: "Inputs manuales",
  lineFactorsAsApplied: "Factores aplicados",
} as const;

export const useRateMeasurementUnitColumns =
  (): GridColDef<RateMeasurementUnit>[] =>
    useMemo<GridColDef<RateMeasurementUnit>[]>(
      () => [
        {
          field: "abbreviation",
          headerName: "Tasa",
          flex: 0.7,
          minWidth: 140,
        },
        {
          field: "numeratorAbbreviation",
          headerName: "Numerador",
          flex: 0.6,
          minWidth: 120,
          sortable: true,
          valueGetter: (_value, row: RateMeasurementUnit) =>
            row.numeratorUnit.abbreviation,
        },
        {
          field: "numeratorMagnitudeName",
          headerName: "Magnitud (numerador)",
          flex: 1,
          minWidth: 180,
          sortable: true,
          valueGetter: (_value, row: RateMeasurementUnit) =>
            row.numeratorUnit.magnitude.name,
        },
        {
          field: "denominatorAbbreviation",
          headerName: "Denominador",
          flex: 0.6,
          minWidth: 120,
          sortable: true,
          valueGetter: (_value, row: RateMeasurementUnit) =>
            row.denominatorUnit.abbreviation,
        },
        {
          field: "denominatorMagnitudeName",
          headerName: "Magnitud (denominador)",
          flex: 1,
          minWidth: 180,
          sortable: true,
          valueGetter: (_value, row: RateMeasurementUnit) =>
            row.denominatorUnit.magnitude.name,
        },
        {
          field: "totalReferenceCount",
          headerName: "Referencias",
          type: "number",
          headerAlign: "right",
          align: "right",
          minWidth: 140,
          flex: 0.4,
          sortable: true,
          renderCell: (
            params: GridRenderCellParams<RateMeasurementUnit, number>
          ) => {
            const { referenceCounts, totalReferenceCount } = params.row;
            const tooltipTitle = (
              <Box>
                <Typography variant="caption" component="div">
                  {REFERENCE_COUNT_LABELS.emissionFactors}:{" "}
                  {referenceCounts.emissionFactors}
                </Typography>
                <Typography variant="caption" component="div">
                  {REFERENCE_COUNT_LABELS.lineInputsAsManualFactor}:{" "}
                  {referenceCounts.lineInputsAsManualFactor}
                </Typography>
                <Typography variant="caption" component="div">
                  {REFERENCE_COUNT_LABELS.lineFactorsAsApplied}:{" "}
                  {referenceCounts.lineFactorsAsApplied}
                </Typography>
              </Box>
            );
            return (
              <Tooltip title={tooltipTitle} arrow>
                <span>{totalReferenceCount}</span>
              </Tooltip>
            );
          },
        },
      ],
      []
    );
