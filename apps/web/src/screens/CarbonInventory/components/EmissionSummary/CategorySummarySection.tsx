import { FC } from "react";
import { Box, Divider, Typography, alpha } from "@mui/material";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { getColorPalette } from "@/utils/categoryColors";
import { EmissionPercentageBadge } from "@/components/EmissionResults";
import { INCOMPLETE_SOURCES_TOOLTIP } from "../../constants";
import { SubcategoryLinesTable } from "./SubcategoryLinesTable";
import { SubcategoryManualRow } from "./SubcategoryManualRow";

interface CategorySummarySectionProps {
  category: GetEmissionsDetailedSummaryResponse["categories"][number];
}

export const CategorySummarySection: FC<CategorySummarySectionProps> = ({
  category,
}) => {
  const categoryColorPalette = getColorPalette(category.color);

  return (
    <Box
      className="flex flex-col gap-3 p-4"
      sx={{ backgroundColor: alpha(categoryColorPalette.main, 0.1) }}
    >
      {/* Category header */}
      <Box className="flex items-center justify-between rounded-lg">
        <Box>
          <Typography
            variant="body1"
            fontWeight="600"
            sx={{ color: categoryColorPalette.dark, lineHeight: 1 }}
          >
            {category.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: categoryColorPalette.dark, opacity: 0.7 }}
          >
            {category.synonyms}
          </Typography>
        </Box>
        <EmissionPercentageBadge
          emissions={category.subtotal}
          percentage={category.percentage}
          categoryColor={category.color}
          highlighted
          incompleteTooltip={
            category.hasIncompleteLines ? INCOMPLETE_SOURCES_TOOLTIP : undefined
          }
        />
      </Box>

      {/* Subcategories */}
      {category.subcategories.map((sub) => (
        <Box key={sub.id} className="flex flex-col gap-3">
          <Divider className="opacity-60" />

          {sub.hasLines ? (
            <SubcategoryLinesTable
              subcategory={sub}
              categoryColor={category.color}
            />
          ) : (
            <SubcategoryManualRow
              subcategory={sub}
              categoryColor={category.color}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};
