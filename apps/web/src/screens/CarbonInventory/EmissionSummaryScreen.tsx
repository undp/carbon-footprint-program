import { FC, useEffect } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { StepHeader } from "./components";
import {
  InventoryAttributesCard,
  EmissionFactorsTable,
} from "./components/EmissionSummary";
import { Routes } from "@/interfaces";
import {
  useEmissionsDetailedSummary,
  useEmissionFactors,
  useMainActivityEquivalence,
  useCarbonInventoryMetadata,
} from "@/api/query";
import { useEmissionSummaryNavigation } from "./hooks/useEmissionSummaryNavigation";
import { EmissionSummary } from "./components/EmissionSummary/EmissionSummary";
import { isCarbonInventoryEditable } from "@repo/utils";

export const EmissionSummaryScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
  });

  const { enqueueSnackbar } = useSnackbar();
  const { goBack, goNext } = useEmissionSummaryNavigation(inventoryId);

  const { data: equivalence, isError: isEquivalenceError } =
    useMainActivityEquivalence(inventoryId);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useEmissionsDetailedSummary(inventoryId);

  const {
    data: factorsData,
    isLoading: isFactorsLoading,
    isError: isFactorsError,
  } = useEmissionFactors(inventoryId);

  const {
    data: metadataData,
    isLoading: isMetadataLoading,
    isError: isMetadataError,
  } = useCarbonInventoryMetadata(inventoryId);

  const isError =
    isSummaryError || isEquivalenceError || isFactorsError || isMetadataError;

  const categories = summaryData?.categories ?? [];

  useEffect(() => {
    if (isError)
      enqueueSnackbar("Ocurrió un error al cargar la información", {
        variant: "error",
        preventDuplicate: true,
      });
  }, [isError, enqueueSnackbar]);

  const isEditBlocked =
    metadataData?.status && !isCarbonInventoryEditable(metadataData.status);

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
      disabled: isEditBlocked,
    },
    tooltipTitle: isEditBlocked
      ? "No se puede acceder a pasos editables del inventario en su estado actual"
      : undefined,
  };

  const nextButton: FooterButton = {
    text: "Siguiente",
    align: "right",
    buttonProps: {
      endIcon: <ArrowRightAltRounded />,
      variant: "contained",
      onClick: goNext,
    },
  };

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        buttons: [backButton, nextButton],
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
          hasError={isMetadataError}
        />

        {/* Category sections */}
        <EmissionSummary
          totalEmissions={summaryData?.totalEmissions ?? 0}
          equivalence={equivalence ?? null}
          categories={categories}
          isLoading={isSummaryLoading}
          hasError={isSummaryError}
        />

        {/* TODO: re-enable GHGBreakdownTable for category 1 once GHG breakdown data is available in the summary endpoint */}

        {/* Emission factors table */}
        <EmissionFactorsTable
          data={factorsData}
          isLoading={isFactorsLoading}
          hasError={isFactorsError}
        />
      </Box>
    </CarbonInventoryLayout>
  );
};
