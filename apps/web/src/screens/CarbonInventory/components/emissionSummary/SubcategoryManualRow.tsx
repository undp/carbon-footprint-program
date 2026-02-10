import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { formatEmissions, formatPercentage } from "@/utils/formatting";

type SubcategoryData =
  GetEmissionsSummaryFullResponse["categories"][number]["subcategories"][number];

interface SubcategoryManualRowProps {
  subcategory: SubcategoryData;
  categoryColor: {
    dark: string;
    light: string;
  };
}

export const SubcategoryManualRow: FC<SubcategoryManualRowProps> = ({
  subcategory,
  categoryColor,
}) => {
  return (
    <Box className="flex flex-col gap-1">
      <Typography
        variant="body2"
        fontWeight="fontWeightSemiBold"
        sx={{ color: categoryColor.dark }}
      >
        {subcategory.name}
      </Typography>
      {subcategory.description && (
        <Typography variant="caption" color="text.secondary">
          {subcategory.description}
        </Typography>
      )}
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
