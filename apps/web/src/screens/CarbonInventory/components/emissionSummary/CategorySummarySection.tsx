import { FC } from "react";
import { Box, Divider, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { EmissionPercentageBadge } from "./EmissionPercentageBadge";
import { SubcategoryLinesTable } from "./SubcategoryLinesTable";
import { SubcategoryManualRow } from "./SubcategoryManualRow";

interface CategorySummarySectionProps {
  category: GetEmissionsSummaryFullResponse["categories"][number];
  isLoading?: boolean;
}

export const CategorySummarySection: FC<CategorySummarySectionProps> = ({
  category,
  isLoading = false,
}) => {
  const theme = useTheme();
  const catKey = Math.min(category.position, 3) as 1 | 2 | 3;
  const categoryColor = theme.palette.category[catKey];

  if (isLoading) {
    return (
      <Skeleton
        variant="rounded"
        height={120}
        sx={{ borderRadius: 2, flexShrink: 0 }}
      />
    );
  }

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
            sx={{ color: categoryColor.dark }}
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
