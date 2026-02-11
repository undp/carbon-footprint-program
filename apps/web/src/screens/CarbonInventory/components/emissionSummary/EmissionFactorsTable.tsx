import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import type { GetEmissionFactorsResponse } from "@repo/types";
import { CategoryChip } from "../CategoryChip";

interface EmissionFactorsTableProps {
  data: GetEmissionFactorsResponse | undefined;
  isLoading: boolean;
}

export const EmissionFactorsTable: FC<EmissionFactorsTableProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={200}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

  return (
    <Box className="flex flex-col gap-3">
      <Typography variant="h5" fontWeight="600">
        Factores utilizados
      </Typography>

      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #d9d9d9",
          "& th, & td": {
            px: 1.5,
            py: 1.5,
            textAlign: "left",
            fontSize: "0.75rem",
            lineHeight: 1.4,
            borderBottom: "1px solid #d9d9d9",
            verticalAlign: "top",
          },
          "& th": {
            backgroundColor: alpha("#414046", 0.03),
            color: "#414046",
            fontWeight: 600,
          },
        }}
      >
        <thead>
          <tr>
            <th>Categoría / Alcance</th>
            <th>Sub-categoría</th>
            <th>Parámetros de actividad</th>
            <th>Factor (Kg CO₂e/unidad)</th>
            <th>Fuente</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row, idx) => {
            return (
              <tr key={idx}>
                <td>
                  <Box className="flex flex-col items-start gap-3 rounded px-2 py-0.5">
                    <CategoryChip
                      label={row.categorySynonyms ?? ""}
                      categoryPosition={row.categoryPosition}
                      sx={{
                        fontSize: "10px",
                        height: "26px",
                      }}
                    />
                    <Typography variant="body2" fontWeight="fontWeightSemiBold">
                      {row.categoryName}
                    </Typography>
                  </Box>
                </td>
                <td>
                  <Typography variant="body2" fontWeight="fontWeightSemiBold">
                    {row.subcategoryName}
                  </Typography>
                </td>
                <td>
                  <Typography variant="body2" fontWeight="fontWeightSemiBold">
                    {row.activityParameter}
                  </Typography>
                </td>
                <td>
                  <Box className="flex flex-col gap-0.5">
                    <Typography variant="body2" fontWeight="fontWeightSemiBold">
                      {row.factorLabel}
                    </Typography>
                    {row.gasBreakdownLines.map((line, lineIdx) => (
                      <Typography
                        key={lineIdx}
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.65rem" }}
                      >
                        {line}
                      </Typography>
                    ))}
                  </Box>
                </td>
                <td>
                  <Box className="flex flex-col">
                    <Typography variant="body2">{row.factorSource}</Typography>
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
                </td>
              </tr>
            );
          })}
        </tbody>
      </Box>
    </Box>
  );
};
