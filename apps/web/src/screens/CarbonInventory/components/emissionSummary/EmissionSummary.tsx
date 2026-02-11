import { FC } from "react";
import { Box, Skeleton } from "@mui/material";
import type { GetEmissionsSummaryFullResponse } from "@repo/types";
import { CategorySummarySection } from "./CategorySummarySection";

interface EmissionSummaryProps {
  categories: GetEmissionsSummaryFullResponse["categories"];
  isLoading?: boolean;
}

export const EmissionSummary: FC<EmissionSummaryProps> = ({
  categories,
  isLoading = false,
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

  return (
    <Box className="flex flex-col gap-2">
      {categories.map((category) => (
        <CategorySummarySection key={category.id} category={category} />
      ))}
    </Box>
  );
};
