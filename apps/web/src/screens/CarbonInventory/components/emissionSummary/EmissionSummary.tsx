import { FC } from "react";
import { Skeleton } from "@mui/material";
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
      <>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={120}
            sx={{ borderRadius: 2, flexShrink: 0 }}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {categories.map((category) => (
        <CategorySummarySection key={category.id} category={category} />
      ))}
    </>
  );
};
