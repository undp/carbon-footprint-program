import { FC, useCallback, useEffect } from "react";
import { Box, Button, Tooltip } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import {
  ArrowRightAltRounded,
  FileDownloadOutlined,
} from "@mui/icons-material";
import { useDownloadCarbonInventory } from "@/hooks";
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

  const { canEdit, hasMembership } = useCarbonInventoryAccess(inventoryId);
  const isEditBlocked = metadataData?.status ? !canEdit : false;
  // Admin viewing an inventory they don't belong to: hide the user-facing
  // navigation (back + "Ir a mis huellas") since admins reach this screen
  // through the admin tools, not the user inventories list.
  const hideOwnerNavigation = isEditBlocked && !hasMembership;

  const { download, isDownloading } = useDownloadCarbonInventory();
  const totalEmissions = summaryData?.totalEmissions ?? 0;
  const canDownload = !!metadataData && !isSummaryLoading && totalEmissions > 0;

  const onDownloadClick = useCallback(() => {
    if (!metadataData) return;
    void download(inventoryId, metadataData.name, metadataData.year);
  }, [download, inventoryId, metadataData]);

  const downloadTooltip = isDownloading
    ? "Descargando..."
    : isMetadataError
      ? "Error al cargar datos"
      : isMetadataLoading || isSummaryLoading
        ? "Cargando datos"
        : totalEmissions === 0
          ? "Sin datos de emisiones"
          : "Descargar huella";

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

  const footerButtons: FooterButton[] = hideOwnerNavigation
    ? [nextButton]
    : [backButton, nextButton];

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
        action: hideOwnerNavigation ? undefined : (
          <CarbonInventoryNavigationButton
            type={user ? "inventories" : "landing"}
            buttonProps={{
              onClick: handleExitClick,
            }}
          />
        ),
      }}
      footerProps={{
        buttons: footerButtons,
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
          <Box className="flex items-center gap-2">
            <Tooltip title={downloadTooltip}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onDownloadClick}
                  disabled={!canDownload || isDownloading}
                  loading={isDownloading}
                  startIcon={<FileDownloadOutlined fontSize="small" />}
                  aria-label="Descargar huella"
                >
                  Descargar
                </Button>
              </span>
            </Tooltip>
            {metadataData?.status && (
              <CarbonInventoryStatusChip
                status={metadataData.status}
                size="medium"
              />
            )}
          </Box>
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
