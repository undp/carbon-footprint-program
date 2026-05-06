/**
 * TODO (WIP): This component is not being displayed yet.
 * It needs to be refactored to:
 *   i)  Use MUI DataGrid instead of the HTML <table>
 *   ii) Read from the new data structure
 */

import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { formatter } from "@/utils/formatting";

type GHGBreakdown = NonNullable<
  GetEmissionsDetailedSummaryResponse["categories"][number]["ghgBreakdown"]
>;

interface GHGBreakdownTableProps {
  breakdown: GHGBreakdown;
  isLoading?: boolean;
}

const GAS_COLUMNS = [
  { key: "totalTCO2e" as const, label: "Total tCO₂e" },
  { key: "co2Fossil" as const, label: "CO₂ fósil" },
  { key: "ch4" as const, label: "CH4" },
  { key: "n2o" as const, label: "N₂O" },
  { key: "hfc" as const, label: "HFC" },
  { key: "pfc" as const, label: "PFC" },
  { key: "sf6" as const, label: "SF6" },
  { key: "nf3" as const, label: "NF3" },
];

export const GHGBreakdownTable: FC<GHGBreakdownTableProps> = ({
  breakdown,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={160}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  if (breakdown.length === 0) return null;

  return (
    <Box className="flex flex-col gap-3">
      <Typography variant="h5" fontWeight="600">
        Emisiones directas por GEI
      </Typography>

      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #d9d9d9",
          "& th, & td": {
            px: 1.5,
            py: 1,
            textAlign: "right",
            fontSize: "0.75rem",
            lineHeight: 1.4,
            borderBottom: "1px solid #d9d9d9",
          },
          "& th": {
            backgroundColor: alpha("#414046", 0.03),
            color: "#414046",
            fontWeight: 600,
          },
          "& th:first-of-type, & td:first-of-type": {
            textAlign: "left",
          },
        }}
      >
        <thead>
          <tr>
            <th>Categoría de fuente</th>
            {GAS_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {breakdown.map((row, index) => (
            <tr key={row.subcategoryName + index}>
              <td>{row.subcategoryName}</td>
              {GAS_COLUMNS.map((col) => (
                <td key={col.key}>{formatter.quantity(row[col.key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
};
