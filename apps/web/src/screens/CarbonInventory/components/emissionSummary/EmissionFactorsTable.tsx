import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { GetEmissionFactorsResponse } from "@repo/types";

interface EmissionFactorsTableProps {
  data: GetEmissionFactorsResponse | undefined;
  isLoading: boolean;
}

export const EmissionFactorsTable: FC<EmissionFactorsTableProps> = ({
  data,
  isLoading,
}) => {
  const theme = useTheme();

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
      <Typography variant="body1" fontWeight="fontWeightSemiBold">
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
            const catKey = Math.min(row.categoryPosition, 3) as 1 | 2 | 3;
            const categoryColor = theme.palette.category[catKey];

            return (
              <tr key={idx}>
                <td>
                  <Box
                    className="inline-block rounded px-2 py-0.5"
                    sx={{ backgroundColor: categoryColor.light }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight="fontWeightSemiBold"
                      sx={{ color: categoryColor.dark }}
                    >
                      {row.categoryName}
                    </Typography>
                  </Box>
                </td>
                <td>{row.subcategoryName}</td>
                <td>{row.activityParameter}</td>
                <td>
                  <Box className="flex flex-col gap-0.5">
                    <Typography
                      variant="caption"
                      fontWeight="fontWeightSemiBold"
                    >
                      {row.factorLabel}
                    </Typography>
                    {row.gasBreakdownLines.map((line, lineIdx) => (
                      <Typography
                        key={lineIdx}
                        variant="caption"
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
                    <Typography variant="caption">
                      {row.factorSource}
                    </Typography>
                    {row.factorSourceDetail && (
                      <Typography
                        variant="caption"
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
