import { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { CategorySummarySection } from "./CategorySummarySection";
import { TotalEmissionsBar } from "./TotalEmissionsBar";

interface EmissionSummaryProps {
  totalEmissions: number;
  equivalence: GetEmissionsSummaryFullResponse["equivalence"] | null;
  categories: GetEmissionsSummaryFullResponse["categories"];
  isLoading?: boolean;
  isEmpty?: boolean;
}

export const EmissionSummary: FC<EmissionSummaryProps> = ({
  categories,
  equivalence,
  totalEmissions,
  isLoading = false,
  isEmpty = false,
}) => {
  if (isLoading) {
    return (
      <Box className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={120}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          />
        ))}
      </Box>
    );
  }

  if (categories.length === 0) {
    return (
      <Box className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-8">
        <Typography variant="body2" color="text.secondary">
          Sin datos de categorías disponibles
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="flex flex-col gap-2">
      {/* Total emissions bar */}
      <TotalEmissionsBar
        totalEmissions={totalEmissions}
        equivalence={equivalence}
        isLoading={isLoading}
        isEmpty={isEmpty}
      />
      {categories.map((category) => (
        <CategorySummarySection key={category.id} category={category} />
      ))}
    </Box>
  );
};
