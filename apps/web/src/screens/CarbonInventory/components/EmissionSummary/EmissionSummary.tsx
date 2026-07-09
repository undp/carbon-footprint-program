import { FC } from "react";
import { Box, Skeleton } from "@mui/material";
import type { GetEmissionsDetailedSummaryResponse } from "@repo/types";
import { CategorySummarySection } from "./CategorySummarySection";
import { TotalEmissionsBar } from "./TotalEmissionsBar";
import { LoadingErrorStateMessage } from "../LoadingErrorStateMessage";
import { EmptyStateMessage } from "../EmptyStateMessage";

interface EmissionSummaryProps {
  totalEmissions: number;
  equivalence: GetEmissionsDetailedSummaryResponse["equivalence"] | null;
  categories: GetEmissionsDetailedSummaryResponse["categories"];
  isLoading?: boolean;
  hasError?: boolean;
}

export const EmissionSummary: FC<EmissionSummaryProps> = ({
  categories,
  equivalence,
  totalEmissions,
  isLoading = false,
  hasError = false,
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

  if (hasError) {
    return (
      <LoadingErrorStateMessage
        className="max-h-[120px]"
        message="Ocurrió un error al cargar las emisiones"
      />
    );
  }

  // Show the summary whenever there is at least one active line (even if it is
  // incomplete and contributes zero emissions), so the user can review what is
  // still pending. Only fall back to the empty state when nothing was registered.
  const hasAnySubcategory = categories.some(
    (category) => category.subcategories.length > 0
  );

  if (!hasAnySubcategory) {
    return (
      <EmptyStateMessage
        className="max-h-[120px]"
        message="Cuando registres actividades, podrás ver el detalle de tus emisiones aquí"
      />
    );
  }

  return (
    <Box className="flex flex-col gap-4">
      {/* Total emissions bar */}
      <TotalEmissionsBar
        totalEmissions={totalEmissions}
        equivalence={equivalence}
      />
      {categories.map((category) => (
        <CategorySummarySection key={category.id} category={category} />
      ))}
    </Box>
  );
};
