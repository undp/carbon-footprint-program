import { FC } from "react";
import { Box, Typography, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { StepHeader } from "./components/StepHeader";
import {
  EmissionSummaryCard,
  EmissionEquivalenceCard,
  EmissionsBarChart,
  EmissionRankingCard,
  ReductionPlanCard,
} from "./components";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";
import { Routes } from "@/interfaces";
import { useEmissionResultsData } from "./hooks/useEmissionResultsData";
import { useEmissionResultsNavigation } from "./hooks/useEmissionResultsNavigation";

export const EmissionResultsScreen: FC = () => {
  const theme = useTheme();
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_RESULTS,
  });

  const { goBack } = useEmissionResultsNavigation(inventoryId);

  // TODO: Replace with actual data from API
  const {
    totalEmissions,
    directEmissions,
    indirectEnergyEmissions,
    otherIndirectEmissions,
    equivalenceValue,
    equivalenceUnit,
    topEmissions,
    ownRankings,
    sectorRankings,
    reductionPlan,
    isLoading,
  } = useEmissionResultsData(inventoryId);

  const directEmissionsPercentage =
    totalEmissions > 0
      ? ((directEmissions / totalEmissions) * 100).toFixed(1)
      : "0.0";

  const indirectEnergyPercentage =
    totalEmissions > 0
      ? ((indirectEnergyEmissions / totalEmissions) * 100).toFixed(1)
      : "0.0";

  const otherIndirectPercentage =
    totalEmissions > 0
      ? ((otherIndirectEmissions / totalEmissions) * 100).toFixed(1)
      : "0.0";

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: goBack,
        },
        showBack: true,
        nextText: "Finalizar",
      }}
      isLoading={isLoading}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-white p-4">
        <StepHeader
          title="Paso 5: Resultados"
          description="Conoce el total de tu huella de carbono y toma acción con el plan de reducción sugerido."
        />

        <Box className="flex gap-3">
          {/* Left section: Summary cards + charts */}
          <Box className="flex flex-1 flex-col gap-3">
            {/* Top section: Emission cards + Equivalence */}
            <Box className="flex gap-3">
              {/* Emission summary cards */}
              <Box className="flex flex-1 flex-col gap-3">
                {/* Total emissions */}
                <Box
                  className="flex flex-col items-start justify-center gap-2 rounded-lg p-3"
                  sx={{
                    backgroundColor: alpha(
                      theme.palette.common.deepForest,
                      0.1
                    ),
                  }}
                >
                  <Box className="flex w-full items-center justify-between">
                    <Box className="flex items-center gap-2">
                      <Box
                        className="flex size-8 items-center justify-center rounded-full"
                        sx={{
                          backgroundColor: alpha(
                            theme.palette.common.deepForest,
                            0.1
                          ),
                        }}
                      >
                        <Box className="flex size-[18px] items-center justify-center">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M9 2L2 6L9 10L16 6L9 2Z"
                              fill={theme.palette.common.deepForest}
                            />
                            <path
                              d="M2 10L9 14L16 10"
                              stroke={theme.palette.common.deepForest}
                              strokeWidth="1.5"
                            />
                            <path
                              d="M2 14L9 18L16 14"
                              stroke={theme.palette.common.deepForest}
                              strokeWidth="1.5"
                            />
                          </svg>
                        </Box>
                      </Box>
                      <Box className="flex flex-col">
                        <Typography
                          variant="body1"
                          fontWeight="fontWeightSemiBold"
                          sx={{ color: theme.palette.common.deepForest }}
                        >
                          Total emisiones
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: theme.palette.common.deepForest }}
                        >
                          Alcances 1,2 y 3
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="body1"
                      fontWeight="fontWeightSemiBold"
                      sx={{ color: theme.palette.common.deepForest }}
                    >
                      {totalEmissions.toFixed(2)} tCO₂e
                    </Typography>
                  </Box>
                </Box>

                {/* Direct emissions (Category 1) */}
                <EmissionSummaryCard
                  icon={
                    <DirectEmissionCategoryIcon
                      sx={{
                        fill: theme.palette.category[1].dark,
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  }
                  title="Emisiones directas:"
                  subtitle="Categoría 1 / Alcance 1"
                  value={`${directEmissions.toFixed(2)} tCO₂e`}
                  percentage={`${directEmissionsPercentage}%`}
                  backgroundColor={theme.palette.category[1].light}
                  textColor={theme.palette.category[1].dark}
                  iconColor={theme.palette.category[1].main}
                />

                {/* Indirect energy emissions (Category 2) */}
                <EmissionSummaryCard
                  icon={
                    <IndirectEmissionCategoryIcon
                      sx={{
                        fill: theme.palette.category[2].dark,
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  }
                  title="Emisiones indirectas por energía:"
                  subtitle="Categoría 2 / Alcance 2"
                  value={`${indirectEnergyEmissions.toFixed(2)} tCO₂e`}
                  percentage={`${indirectEnergyPercentage}%`}
                  backgroundColor={theme.palette.category[2].light}
                  textColor={theme.palette.category[2].dark}
                  iconColor={theme.palette.category[2].main}
                />

                {/* Other indirect emissions (Category 3) */}
                <EmissionSummaryCard
                  icon={
                    <OthersCategoryIcon
                      sx={{
                        fill: theme.palette.category[3].dark,
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  }
                  title="Otras emisiones indirectas:"
                  subtitle="Categorías 3,4,5 y 6 / Alcance 3"
                  value={`${otherIndirectEmissions.toFixed(2)} tCO₂e`}
                  percentage={`${otherIndirectPercentage}%`}
                  backgroundColor={theme.palette.category[3].light}
                  textColor={theme.palette.category[3].dark}
                  iconColor={theme.palette.category[3].main}
                />
              </Box>

              {/* Equivalence card */}
              <Box className="w-[223px]">
                <EmissionEquivalenceCard
                  value={equivalenceValue}
                  unit={equivalenceUnit}
                />
              </Box>
            </Box>

            {/* Bottom section: Bar chart + Rankings */}
            <Box className="flex flex-1 gap-3">
              {/* Bar chart */}
              <Box className="flex-1">
                <EmissionsBarChart data={topEmissions} />
              </Box>

              {/* Rankings */}
              <Box className="w-[445px]">
                <EmissionRankingCard
                  ownRankings={ownRankings}
                  sectorRankings={sectorRankings}
                />
              </Box>
            </Box>
          </Box>

          {/* Right section: Reduction plan */}
          <Box className="w-[284px]">
            <ReductionPlanCard
              title={reductionPlan.title}
              mainGoal={reductionPlan.mainGoal}
              actions={reductionPlan.actions}
            />
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
