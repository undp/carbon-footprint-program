import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { getColorPalette } from "@/utils/categoryColors";
import { EmissionPercentageBadge } from "@/components/EmissionResults";
import { INCOMPLETE_SOURCES_TOOLTIP } from "../../constants";

interface SubcategoryManualRowProps {
  subcategory: GetEmissionsDetailedSummaryResponse["categories"][number]["subcategories"][number];
  categoryColor: string;
}

export const SubcategoryManualRow: FC<SubcategoryManualRowProps> = ({
  subcategory,
  categoryColor,
}) => {
  const categoryColorPalette = getColorPalette(categoryColor);
  return (
    <Box className="flex w-full items-center justify-between">
      <Box className="flex w-[80%] flex-col gap-1">
        <Typography
          variant="body2"
          fontWeight="600"
          sx={{ color: categoryColorPalette.dark }}
        >
          {subcategory.name}
        </Typography>
      </Box>
      <EmissionPercentageBadge
        emissions={subcategory.subtotal}
        percentage={subcategory.percentage}
        categoryColor={categoryColor}
        incompleteTooltip={
          subcategory.hasIncompleteLines
            ? INCOMPLETE_SOURCES_TOOLTIP
            : undefined
        }
      />
    </Box>
  );
};
