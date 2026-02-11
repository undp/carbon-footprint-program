import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { EmissionPercentageBadge } from "./EmissionPercentageBadge";

interface SubcategoryManualRowProps {
  subcategory: GetEmissionsSummaryFullResponse["categories"][number]["subcategories"][number];
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
    <Box className="flex w-full items-center justify-between">
      <Box className="flex w-[80%] flex-col gap-1">
        <Typography
          variant="body2"
          fontWeight="600"
          sx={{ color: categoryColor.dark }}
        >
          {subcategory.name}
        </Typography>
      </Box>
      <EmissionPercentageBadge
        emissions={subcategory.subtotal}
        percentage={subcategory.percentage}
        categoryColor={categoryColor}
      />
    </Box>
  );
};
