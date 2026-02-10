import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { formatEmissions, formatPercentage } from "@/utils/formatting";

type SubcategoryData =
  GetEmissionsSummaryFullResponse["categories"][number]["subcategories"][number];

interface SubcategoryLinesTableProps {
  subcategory: SubcategoryData;
  categoryColor: {
    main: string;
    dark: string;
    light: string;
  };
}

export const SubcategoryLinesTable: FC<SubcategoryLinesTableProps> = ({
  subcategory,
  categoryColor,
}) => {
  return (
    <Box className="flex flex-col gap-2">
      <Typography
        variant="body2"
        fontWeight="fontWeightSemiBold"
        sx={{ color: categoryColor.dark }}
      >
        {subcategory.name}
      </Typography>

      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          "& th, & td": {
            px: 1,
            py: 0.5,
            textAlign: "left",
            fontSize: "0.75rem",
            lineHeight: 1.4,
            borderBottom: `1px solid ${alpha(categoryColor.main, 0.2)}`,
          },
          "& th": {
            backgroundColor: categoryColor.light,
            color: categoryColor.dark,
            fontWeight: 600,
          },
          "& td": {
            color: categoryColor.dark,
          },
        }}
      >
        <thead>
          <tr>
            <th>Fuente de emisión</th>
            <th>Unidad</th>
            <th>Cantidad</th>
            <th>Factor kgCO₂e/unidad</th>
            <th>Fuente factor</th>
            <th style={{ textAlign: "right" }}>Emisiones tCO₂e</th>
          </tr>
        </thead>
        <tbody>
          {subcategory.lines.map((line) => (
            <tr key={line.lineId}>
              <td>{line.emissionSource}</td>
              <td>{line.measurementUnitName ?? "-"}</td>
              <td>
                {line.quantity != null
                  ? line.quantity.toLocaleString("es-CL")
                  : "-"}
              </td>
              <td>
                {line.factorValue != null
                  ? line.factorValue.toLocaleString("es-CL", {
                      maximumFractionDigits: 4,
                    })
                  : "-"}
              </td>
              <td>{line.factorSource ?? "-"}</td>
              <td style={{ textAlign: "right" }}>
                {line.emissions.toLocaleString("es-CL", {
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </Box>

      {/* Subtotal row */}
      <Box className="flex items-center justify-end gap-2">
        <Typography variant="caption" sx={{ color: categoryColor.dark }}>
          {formatEmissions(subcategory.subtotal)}
        </Typography>
        <Box
          className="rounded px-1.5 py-0.5"
          sx={{ backgroundColor: categoryColor.light }}
        >
          <Typography
            variant="caption"
            fontWeight="fontWeightSemiBold"
            sx={{ color: categoryColor.dark }}
          >
            {formatPercentage(subcategory.percentage)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
