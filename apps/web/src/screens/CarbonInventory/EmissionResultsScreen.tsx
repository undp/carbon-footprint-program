import { FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { StepHeader } from "./components/StepHeader";
import {
  EmissionCategorySummary,
  EmissionEquivalenceCard,
  EmissionsPieChart,
  EmissionRankingCard,
  ReductionPlanCard,
} from "./components";
import { Routes } from "@/interfaces";
import { useEmissionResults } from "@/api/query";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";
import { ArrowRightAltRounded } from "@mui/icons-material";

export const EmissionResultsScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
  });

  const { goBack, goToList } = useEmissionResultsNavigation(inventoryId);

  const { data, isLoading } = useEmissionResults(inventoryId);

  const totalEmissions = data?.totalEmissions ?? 0;
  const categories = data?.categories ?? [];
  const reductionPlan = data?.suggestedReductionPlan;
  const ranking = data?.subcategoriesRanking;
  const equivalence = data?.mainActivityEquivalence;

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
        subtitle: data?.carbonInventory.name ?? undefined,
      }}
      footerProps={{
        buttons: [
          {
            text: "Volver",
            align: "right",
            buttonProps: {
              startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
              onClick: goBack,
            },
          },
          {
            text: "Guardar Borrador",
            align: "right",
            buttonProps: {
              variant: "contained",
              onClick: goToList,
            },
          },
        ],
      }}
      isLoading={isLoading}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 rounded-lg bg-white p-4">
        <StepHeader
          title="Paso 5: Resultados"
          description="Conoce el total de tu huella de carbono y toma acción con el plan de reducción sugerido."
        />

        {/* Page Content */}
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
                />
              </Box>
              <Box className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                <EmissionEquivalenceCard
                  value={equivalence?.rate.toFixed(2).replace(".", ",") ?? null}
                  unit={
                    equivalence ? `kg CO₂e/${equivalence.activityName}` : null
                  }
                />
              </Box>
            </Box>
            {/* Bottom subcontainer: plot + rankings */}
            <Box className="flex min-h-0 flex-1 flex-row gap-4">
              <Box className="flex min-h-0 flex-1">
                <EmissionsPieChart
                  categories={categories.map((c) => ({
                    name: c.name,
                    subtotal: c.subtotal,
                    percentage: c.percentage,
                  }))}
                  totalEmissions={totalEmissions}
                />
              </Box>
              <Box className="flex min-h-0 flex-1">
                <EmissionRankingCard
                  ownRankings={ranking?.own ?? []}
                  sectorRankings={ranking?.sector ?? []}
                  categories={categories.map((c) => ({
                    id: c.id,
                    name: c.name,
                    synonyms: c.synonyms,
                    position: c.position,
                  }))}
                />
              </Box>
            </Box>
          </Box>
          {/* Right container: reduction plan */}
          <Box className="flex min-h-0 flex-1">
            <ReductionPlanCard
              mainGoal={reductionPlan?.summary ?? null}
              actions={reductionPlan?.items ?? null}
              // TODO: implement navigation to full reduction plan
              onViewFullPlan={() => {}}
            />
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
