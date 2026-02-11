import { FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { CarbonInventoryLayout } from "./layout";
import { StepHeader } from "./components";
import {
  InventoryAttributesCard,
  TotalEmissionsBar,
  // GHGBreakdownTable,
  EmissionFactorsTable,
} from "./components/emissionSummary";
import { Routes } from "@/interfaces";
import {
  useEmissionsSummaryFull,
  useEmissionFactors,
  useMainActivityEquivalence,
  useCarbonInventoryMetadata,
} from "@/api/query";
import { useEmissionSummaryNavigation } from "./hooks/useEmissionSummaryNavigation";
import { EmissionSummary } from "./components/emissionSummary/EmissionSummary";

export const EmissionSummaryScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
  });

  const { goBack, goNext } = useEmissionSummaryNavigation(inventoryId);

  const { data: equivalence, isLoading: isEquivalenceLoading } =
    useMainActivityEquivalence(inventoryId);

  const { data: summaryData, isLoading: isSummaryLoading } =
    useEmissionsSummaryFull(inventoryId);

  const { data: factorsData, isLoading: isFactorsLoading } =
    useEmissionFactors(inventoryId);

  const { data: metadataData, isLoading: isMetadataLoading } =
    useCarbonInventoryMetadata(inventoryId);

  const categories = summaryData?.categories ?? [];
  // const ghgCategory = categories.find(
  //   (c) => c.position === 1 && c.ghgBreakdown
  // );

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
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
            text: "Siguiente",
            align: "right",
            buttonProps: {
              endIcon: <ArrowRightAltRounded />,
              variant: "contained",
              onClick: goNext,
            },
          },
        ],
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-lg bg-white p-6">
        {/* Header */}
        <Box className="flex items-center justify-between">
          <StepHeader
            title="Paso 4: Resumen"
            description="Verifica tus datos antes de calcular"
          />
        </Box>

        {/* Inventory attributes */}
        <InventoryAttributesCard
          data={metadataData}
          isLoading={isMetadataLoading}
        />

        {/* Total emissions bar */}
        <TotalEmissionsBar
          totalEmissions={summaryData?.totalEmissions ?? 0}
          equivalence={equivalence ?? null}
          isLoading={isSummaryLoading || isEquivalenceLoading}
        />

        {/* Category sections */}
        <EmissionSummary categories={categories} isLoading={isSummaryLoading} />

        {/* GHG Breakdown table (only for category 1) */}
        {/* <GHGBreakdownTable
          breakdown={ghgCategory?.ghgBreakdown ?? []}
          isLoading={isSummaryLoading}
        /> */}

        {/* Emission factors table */}
        <EmissionFactorsTable data={factorsData} isLoading={isFactorsLoading} />
      </Box>
    </CarbonInventoryLayout>
  );
};
