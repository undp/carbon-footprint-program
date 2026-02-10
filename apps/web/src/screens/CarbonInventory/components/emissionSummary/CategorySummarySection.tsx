import { FC } from "react";
import { Box, Skeleton, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { formatEmissions, formatPercentage } from "@/utils/formatting";
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
    <Box className="flex flex-col gap-3">
      {/* Category header */}
      <Box
        className="flex items-center justify-between rounded-lg px-4 py-2"
        sx={{ backgroundColor: alpha(categoryColor.main, 0.1) }}
      >
        <Box>
          <Typography
            variant="body1"
            fontWeight="fontWeightSemiBold"
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
        <Box className="flex items-center gap-2">
          <Typography
            variant="body1"
            fontWeight="fontWeightSemiBold"
            sx={{ color: categoryColor.dark }}
          >
            {formatEmissions(category.subtotal)}
          </Typography>
          <Box
            className="rounded px-2 py-0.5"
            sx={{ backgroundColor: categoryColor.light }}
          >
            <Typography
              variant="caption"
              fontWeight="fontWeightSemiBold"
              sx={{ color: categoryColor.dark }}
            >
              {formatPercentage(category.percentage)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Subcategories */}
      {category.subcategories.map((sub, idx) => (
        <Box key={sub.id} className="flex flex-col gap-3 px-2">
          {idx > 0 && (
            <Box
              sx={{
                height: "1px",
                backgroundColor: alpha(categoryColor.main, 0.2),
              }}
            />
          )}
          {sub.hasLines && sub.lines.length > 0 ? (
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
