import { FC } from "react";
import { Avatar, Box, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { StepHeader } from "./components/StepHeader";
import {
  EmissionSummaryCard,
  EmissionEquivalenceCard,
  EmissionsPieChart,
  EmissionRankingCard,
  ReductionPlanCard,
} from "./components";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";
import { Routes } from "@/interfaces";
import { useEmissionResults } from "@/api/query";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";
import { ArrowRightAltRounded, BarChartOutlined } from "@mui/icons-material";
import type { GetCarbonInventoryResultsResponse } from "@repo/types";

type CategoryResult = GetCarbonInventoryResultsResponse["categories"][number];

const CATEGORY_ICONS: Record<number, FC<{ sx?: object }>> = {
  1: DirectEmissionCategoryIcon,
  2: IndirectEmissionCategoryIcon,
  3: OthersCategoryIcon,
};

const formatEmissions = (value: number): string =>
  `${value.toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}  tCO₂e`;

const formatPercentage = (value: number): string =>
  `${(value * 100).toFixed(1).replace(".", ",")}%`;

function TotalEmissionsCard({ totalEmissions }: { totalEmissions: number }) {
  const theme = useTheme();
  return (
    <Box
      className="flex h-full items-center justify-between rounded-lg p-3"
      sx={{ backgroundColor: alpha(theme.palette.common.deepForest, 0.1) }}
    >
      <Box className="flex items-center gap-2">
        <Avatar
          sx={{
            width: 32,
            height: 32,
            backgroundColor: alpha(theme.palette.common.deepForest, 0.1),
          }}
        >
          <BarChartOutlined color="disabled" />
        </Avatar>
        <Typography
          variant="body1"
          fontWeight="fontWeightSemiBold"
          sx={{ color: theme.palette.common.deepForest }}
        >
          Total emisiones
        </Typography>
      </Box>
      <Typography
        variant="body1"
        fontWeight="fontWeightSemiBold"
        sx={{ color: theme.palette.common.deepForest }}
      >
        {formatEmissions(totalEmissions)}
      </Typography>
    </Box>
  );
}

function CategoryEmissionCard({ category }: { category: CategoryResult }) {
  const theme = useTheme();
  const catKey = Math.min(category.position, 3) as 1 | 2 | 3;
  const Icon = CATEGORY_ICONS[catKey] ?? OthersCategoryIcon;

  return (
    <EmissionSummaryCard
      icon={
        <Icon
          sx={{
            fill: theme.palette.category[catKey].dark,
            width: "100%",
            height: "100%",
          }}
        />
      }
      title={`${category.name}:`}
      subtitle={category.synonyms ?? `Categoría ${category.position}`}
      value={formatEmissions(category.subtotal)}
      percentage={formatPercentage(category.percentage)}
      backgroundColor={theme.palette.category[catKey].light}
      textColor={theme.palette.category[catKey].dark}
      iconColor={theme.palette.category[catKey].main}
    />
  );
}

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
            <TotalEmissionsCard totalEmissions={totalEmissions} />
            {categories.map((category) => (
              <CategoryEmissionCard key={category.id} category={category} />
            ))}
          </Box>
              <Box className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            <EmissionEquivalenceCard
              value={
                equivalence
                  ? equivalence.rate.toFixed(2).replace(".", ",")
                  : "—"
              }
              unit={
                equivalence
                  ? `kg CO₂e/${equivalence.activityName}`
                  : "kg CO₂e/unidad"
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
              title="Plan de reducción sugerido"
              mainGoal={reductionPlan?.summary ?? ""}
              actions={reductionPlan?.items ?? []}
              // TODO: implement navigation to full reduction plan
              onViewFullPlan={() => {}}
            />
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
