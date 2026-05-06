import { FC, useEffect } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useAuth } from "@/contexts";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import {
  StepHeader,
  CarbonInventoryNavigationButton,
  ExitInventoryDialog,
} from "./components";
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
import { useExitDialog } from "./hooks/useExitDialog";
import { EmissionSummary } from "./components/EmissionSummary/EmissionSummary";
import { CarbonInventoryStatusChip } from "@/components/CarbonInventoryStatusChip";
import { useCommonNavigation } from "./hooks/useCommonNavigation";
import { useInventoryErrorHandler } from "./hooks/useInventoryErrorHandler";
import capitalize from "lodash-es/capitalize";
import { VOCAB } from "@/config/vocab";
import { useCarbonInventoryAccess } from "@/hooks";

const EMISSION_SUMMARY_EXPLANATION_SLUGS = {
  MAIN: "emission-summary",
} as const;

export const EmissionSummaryScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
  });

  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { goBack, goNext } = useEmissionSummaryNavigation(inventoryId);
  const { goToList, goToLanding } = useCommonNavigation();
  const { handleExitClick, dialogProps } = useExitDialog({
    user,
    onUserExit: goToList,
    onGuestConfirm: goToLanding,
  });

  const { data: equivalence, isError: isEquivalenceError } =
    useMainActivityEquivalence(inventoryId);

  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
    error: summaryError,
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

  useInventoryErrorHandler(summaryError);

  useEffect(() => {
    if (isError)
      enqueueSnackbar("Ocurrió un error al cargar la información", {
        variant: "error",
        preventDuplicate: true,
      });
  }, [isError, enqueueSnackbar]);

  const { canEdit } = useCarbonInventoryAccess(inventoryId);
  const isEditBlocked = metadataData?.status ? !canEdit : false;

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: goBack,
      disabled: isEditBlocked || isMetadataLoading,
    },
    tooltipTitle: isEditBlocked ? "No puedes editar esta huella" : undefined,
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
        title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
        action: (
          <CarbonInventoryNavigationButton
            type={user ? "inventories" : "landing"}
            buttonProps={{
              onClick: handleExitClick,
            }}
          />
        ),
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
            explanationSlug={EMISSION_SUMMARY_EXPLANATION_SLUGS.MAIN}
          />
          {metadataData?.status && (
            <CarbonInventoryStatusChip
              status={metadataData.status}
              size="medium"
            />
          )}
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
      <ExitInventoryDialog {...dialogProps} />
    </CarbonInventoryLayout>
  );
};
