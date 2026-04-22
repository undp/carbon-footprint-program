import { FC, useEffect } from "react";
import { Box } from "@mui/material";
import { useSnackbar } from "notistack";
import { useNavigate } from "@tanstack/react-router";
import {
  useEmissionsSummaryCategories,
  useSubcategoriesRanking,
  useSectorRanking,
  useMainActivityEquivalence,
  useSuggestedReductionPlan,
} from "@/api/query";
import { Routes } from "@/interfaces/routes/routes.const";
import { EmissionCategorySummary } from "./EmissionCategorySummary";
import { EmissionEquivalenceCard } from "./EmissionEquivalenceCard";
import { EmissionsPieChart } from "./EmissionsPieChart";
import { EmissionRankingCard } from "./EmissionRankingCard";
import { ReductionPlanCard } from "./ReductionPlanCard";
import { CarbonInventoryBadgesCard } from "@/components/CarbonInventoryBadgesCard";

interface EmissionResultsContentProps {
  inventoryId: string;
  showBadges?: boolean;
}

export const EmissionResultsContent: FC<EmissionResultsContentProps> = ({
  inventoryId,
  showBadges = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useEmissionsSummaryCategories(inventoryId);

  const {
    data: ownRankings,
    isLoading: isOwnRankingLoading,
    isError: isOwnRankingError,
  } = useSubcategoriesRanking(inventoryId);

  const {
    data: sectorRankings,
    isLoading: isSectorRankingLoading,
    isError: isSectorRankingError,
  } = useSectorRanking(inventoryId);

  const {
    data: equivalence,
    isLoading: isEquivalenceLoading,
    isError: isEquivalenceError,
  } = useMainActivityEquivalence(inventoryId);

  const {
    data: reductionPlan,
    isLoading: isReductionPlanLoading,
    isError: isReductionPlanError,
  } = useSuggestedReductionPlan(inventoryId);

  const isError =
    isSummaryError ||
    isOwnRankingError ||
    isSectorRankingError ||
    isEquivalenceError ||
    isReductionPlanError;

  const totalEmissions = summaryData?.totalEmissions ?? 0;
  const categories = summaryData?.categories ?? [];

  useEffect(() => {
    if (isError)
      enqueueSnackbar("Ocurrió un error al cargar la información", {
        variant: "error",
        preventDuplicate: true,
      });
  }, [isError, enqueueSnackbar]);

  return (
    <Box className="flex min-h-0 flex-1 flex-row gap-4">
      {/* Left container: Emission category cards + equivalence + plot + rankings */}
      <Box className="flex min-h-0 flex-3 flex-col gap-4">
        {/* Top subcontainer: Emission category cards + equivalence */}
        <Box className="flex min-h-0 flex-1 flex-row gap-4">
          {/* Emission category cards */}
          <Box className="flex min-h-0 flex-3 flex-col gap-3 overflow-y-auto">
            <EmissionCategorySummary
              totalEmissions={totalEmissions}
              categories={categories}
              isLoading={isSummaryLoading}
              hasError={isSummaryError}
            />
          </Box>
          <Box className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <EmissionEquivalenceCard
              value={equivalence?.rate.toFixed(2).replace(".", ",") ?? null}
              unit={equivalence ? `kg CO₂e/${equivalence.activityName}` : null}
              isLoading={isEquivalenceLoading}
              hasError={isEquivalenceError}
            />
          </Box>
        </Box>
        {/* Bottom subcontainer: plot + rankings */}
        <Box className="flex min-h-0 flex-1 flex-row gap-4">
          {showBadges ? (
            <Box className="flex min-h-0 flex-1">
              <CarbonInventoryBadgesCard inventoryId={inventoryId} />
            </Box>
          ) : (
            <Box className="flex min-h-0 flex-1">
              <EmissionsPieChart
                categories={categories.map((c) => ({
                  name: c.name,
                  subtotal: c.subtotal,
                  percentage: c.percentage,
                  color: c.color,
                }))}
                totalEmissions={totalEmissions}
                isLoading={isSummaryLoading}
                hasError={isSummaryError}
              />
            </Box>
          )}
          <Box className="flex min-h-0 flex-1">
            <EmissionRankingCard
              ownRankings={ownRankings ?? []}
              sectorRankings={sectorRankings ?? []}
              isLoading={isOwnRankingLoading || isSectorRankingLoading}
              hasError={isOwnRankingError || isSectorRankingError}
            />
          </Box>
        </Box>
      </Box>
      {/* Right container: reduction plan */}
      <Box className="flex min-h-0 flex-1">
        <ReductionPlanCard
          initiatives={reductionPlan ?? null}
          onViewFullPlan={() => {
            const organizationId =
              summaryData?.carbonInventory.organizationId ?? "none";
            void navigate({
              to: Routes.REDUCTION_PLAN,
              search: {
                organizationId,
                carbonInventoryId: inventoryId,
              },
            });
          }}
          isViewFullPlanDisabled={isSummaryLoading || !summaryData}
          isLoading={isReductionPlanLoading}
          hasError={isReductionPlanError}
        />
      </Box>
    </Box>
  );
};
