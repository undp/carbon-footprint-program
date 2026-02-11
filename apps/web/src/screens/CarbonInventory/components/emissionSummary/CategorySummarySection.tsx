import { FC } from "react";
import { Box, Divider, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { EmissionPercentageBadge } from "./EmissionPercentageBadge";
import { SubcategoryLinesTable } from "./SubcategoryLinesTable";
import { SubcategoryManualRow } from "./SubcategoryManualRow";

interface CategorySummarySectionProps {
  category: GetEmissionsDetailedSummaryResponse["categories"][number];
}

export const CategorySummarySection: FC<CategorySummarySectionProps> = ({
  category,
}) => {
  const theme = useTheme();
  const catKey = Math.min(category.position, 3) as 1 | 2 | 3;
  const categoryColor = theme.palette.category[catKey];

  return (
    <Box
      className="flex flex-col gap-3 p-4"
      sx={{ backgroundColor: alpha(categoryColor.main, 0.1) }}
    >
      {/* Category header */}
      <Box className="flex items-center justify-between rounded-lg">
        <Box>
          <Typography
            variant="body1"
            fontWeight="600"
            sx={{ color: categoryColor.dark, lineHeight: 1 }}
          >
            {category.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: categoryColor.dark, opacity: 0.7 }}
          >
            {category.synonyms}
          </Typography>
        </Box>
        <EmissionPercentageBadge
          emissions={category.subtotal}
          percentage={category.percentage}
          categoryColor={categoryColor}
          highlighted
        />
      </Box>

      {/* Subcategories */}
      {category.subcategories.map((sub) => (
        <Box key={sub.id} className="flex flex-col gap-3">
          <Divider className="opacity-60" />

          {sub.hasLines ? (
            <SubcategoryLinesTable
              subcategory={sub}
              categoryColor={categoryColor}
            />
          ) : (
            <SubcategoryManualRow
              subcategory={sub}
              categoryColor={categoryColor}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};
