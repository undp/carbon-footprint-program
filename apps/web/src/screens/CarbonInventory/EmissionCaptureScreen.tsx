import { FC, useMemo, useCallback, useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import { AddRounded } from "@mui/icons-material";
import { useParams } from "@tanstack/react-router";
import { FormProvider, useWatch } from "react-hook-form";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import {
  StepHeader,
  ExitInventoryDialog,
  CarbonInventoryNavigationButton,
  CategoryCarousel,
  EmissionEditor,
  TotalCategoryEmissionCard,
  AddSubcategoryModal,
} from "./components";
import { useAuth } from "@/contexts";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useEmissionCaptureNavigation } from "./hooks/useEmissionCaptureNavigation";
import { useEmissionCaptureCategory } from "./hooks/useEmissionCaptureCategory";
import { useEmissionCaptureForm } from "./hooks/useEmissionCaptureForm";
import { useEmissionCaptureSubmit } from "./hooks/useEmissionCaptureSubmit";
import { useEmissionCaptureState } from "./hooks/useEmissionCaptureState";
import { EmissionCaptureFormValues } from "./types/EmissionCaptureTypes";
import {
  areAllSubcategoriesFilled,
  shouldShowSubcategory,
} from "./utils/emissionCaptureValidation";
import { IS_DEVELOPMENT } from "@/config/environment";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import { UsageMode } from "@repo/types";
import { useCarbonInventory } from "@/api/query";
import { useInventoryEditGuard } from "./hooks/useInventoryEditGuard";
import { useExitDialog } from "./hooks/useExitDialog";
import { useCommonNavigation } from "./hooks/useCommonNavigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useInventoryErrorHandler } from "./hooks/useInventoryErrorHandler";
import capitalize from "lodash-es/capitalize";
import { VOCAB } from "@/config/vocab";

const EMISSION_CAPTURE_EXPLANATION_SLUGS = {
  MAIN: "emission-capture",
} as const;

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });
  const { user } = useAuth();

  const { data: existingInventory, error: inventoryError } =
    useCarbonInventory(inventoryId);

  const { isReady, mustNavigateAway } = useInventoryEditGuard(
    inventoryId,
    existingInventory?.status
  );

  const { selectedCategory, handleCategoryChange } =
    useEmissionCaptureCategory();

  const { data, isLoading: isEmissionCaptureLoading } = useEmissionCaptureData({
    inventoryId,
  });

  // Default to first category once data loads if current selection doesn't match any category
  useEffect(() => {
    if (!data?.categories.length) return;
    if (!data.categories.some((c) => c.id === selectedCategory)) {
      handleCategoryChange(data.categories[0].id);
    }
  }, [data?.categories, selectedCategory, handleCategoryChange]);

  const { goBack, goNext } = useEmissionCaptureNavigation(inventoryId);
  const { goToList, goToLanding } = useCommonNavigation();

  useInventoryErrorHandler(inventoryError);

  const activeActionsCount = useEmissionCaptureState(
    (state) => state.activeActionsCount
  );

  // Form setup
  const methods = useEmissionCaptureForm({ data });
  const { handleSubmit, formState, resetAfterSave, getDirtyLineIds } = methods;

  const { submit: submitAndGoBack, isSubmitting: isSubmittingAndGoingBack } =
    useEmissionCaptureSubmit({
      inventoryId,
      onSuccess: goBack,
      isDirty: formState.isDirty,
      getDirtyLineIds,
      resetAfterSave,
      showNoChangesMessage: false,
    });

  const {
    submit: submitOnCategoryChange,
    isSubmitting: isSubmittingOnCategoryChange,
  } = useEmissionCaptureSubmit({
    inventoryId,
    isDirty: formState.isDirty,
    getDirtyLineIds,
    resetAfterSave,
    showNoChangesMessage: false,
    resultFeedbackWithSnackbar: true,
  });

  const {
    submit: submitAndGoToList,
    isSubmitting: isSubmittingAndGoingToList,
  } = useEmissionCaptureSubmit({
    inventoryId,
    onSuccess: goToList,
    isDirty: formState.isDirty,
    getDirtyLineIds,
    resetAfterSave,
    showNoChangesMessage: false,
  });

  const [isAddSubcategoryModalOpen, setIsAddSubcategoryModalOpen] =
    useState(false);

  const { submit: submitBeforeModal, isSubmitting: isSubmittingBeforeModal } =
    useEmissionCaptureSubmit({
      inventoryId,
      isDirty: formState.isDirty,
      getDirtyLineIds,
      resetAfterSave,
      showNoChangesMessage: false,
      resultFeedbackWithSnackbar: true,
      throwOnError: true,
      onSuccess: () => setIsAddSubcategoryModalOpen(true),
    });

  const selectedCategoryData = useMemo(
    () => data?.categories.find((category) => category.id === selectedCategory),
    [data, selectedCategory]
  );

  const isBusy = activeActionsCount > 0;

  const globalSubmitting =
    isSubmittingAndGoingToList ||
    isSubmittingAndGoingBack ||
    isSubmittingOnCategoryChange ||
    isSubmittingBeforeModal;

  const handleOpenAddSubcategoryModal = useCallback(() => {
    void handleSubmit(async (formValues) => {
      try {
        await submitBeforeModal(formValues);
      } catch {
        // Error snackbar already shown; modal stays closed
      }
    })();
  }, [handleSubmit, submitBeforeModal]);

  const handleCategoryChangeWithSave = useCallback(
    (categoryId: string) => {
      void handleSubmit(async (data) => {
        await submitOnCategoryChange(data);
        handleCategoryChange(categoryId);
      })();
    },
    [handleSubmit, submitOnCategoryChange, handleCategoryChange]
  );

  const selectedCategoryIndex = useMemo(
    () => data?.categories.findIndex((c) => c.id === selectedCategory) ?? -1,
    [data?.categories, selectedCategory]
  );
  const isLastCategory =
    selectedCategoryIndex === (data?.categories.length ?? 0) - 1;
  const isFirstCategory = selectedCategoryIndex === 0;
  const nextCategoryId = !isLastCategory
    ? (data?.categories[selectedCategoryIndex + 1]?.id ?? null)
    : null;
  const previousCategoryId = !isFirstCategory
    ? (data?.categories[selectedCategoryIndex - 1]?.id ?? null)
    : null;

  const checkAllSubcategoriesFilled = useCallback(
    (formValues: EmissionCaptureFormValues): boolean => {
      return areAllSubcategoriesFilled(data?.categories ?? [], formValues);
    },
    [data]
  );

  const confirmDialog = useConfirmDialog();

  const handleWarningConfirm = useCallback(() => {
    confirmDialog.closeConfirm();
    goNext();
  }, [confirmDialog, goNext]);

  const handleBackClick = useCallback(() => {
    if (!isFirstCategory && previousCategoryId) {
      handleCategoryChangeWithSave(previousCategoryId);
    } else {
      void handleSubmit(submitAndGoBack)();
    }
  }, [
    isFirstCategory,
    previousCategoryId,
    handleCategoryChangeWithSave,
    handleSubmit,
    submitAndGoBack,
  ]);

  const handleNextClick = useCallback(() => {
    if (!isLastCategory && nextCategoryId) {
      handleCategoryChangeWithSave(nextCategoryId);
    } else {
      void handleSubmit(async (formValues) => {
        await submitOnCategoryChange(formValues);
        if (checkAllSubcategoriesFilled(formValues)) {
          goNext();
        } else {
          confirmDialog.openConfirm({
            title: "Subcategorías sin completar",
            message:
              "Hay subcategorías que no tienen datos cargados. Si continúas, quedarán sin emisiones calculadas.",
            variant: "error",
            confirmLabel: "Continuar",
            cancelLabel: "Revisar",
          });
        }
      })();
    }
  }, [
    isLastCategory,
    nextCategoryId,
    handleCategoryChangeWithSave,
    handleSubmit,
    submitOnCategoryChange,
    checkAllSubcategoriesFilled,
    goNext,
    confirmDialog,
  ]);

  // Watch subcategories for reactive updates
  const watchedSubcategories = useWatch({
    control: methods.control,
    name: "subcategories",
  });

  const isLoading = isEmissionCaptureLoading || !isReady;

  const { handleExitClick, dialogProps } = useExitDialog({
    user,
    onUserExit: () => void handleSubmit(submitAndGoToList)(),
    onGuestConfirm: goToLanding,
  });

  if (!isLoading && mustNavigateAway) return null;

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: handleBackClick,
      loading: isSubmittingAndGoingBack,
      disabled: globalSubmitting || isBusy,
    },
  };

  const nextButton: FooterButton = {
    text: "Siguiente",
    align: "right",
    buttonProps: {
      endIcon: <ArrowRightAltRounded />,
      variant: "contained",
      onClick: handleNextClick,
      loading: isSubmittingOnCategoryChange,
      disabled: globalSubmitting || isBusy,
    },
  };

  return (
    <FormProvider {...methods}>
      <form id="emission-capture-form" noValidate>
        <CarbonInventoryLayout
          headerProps={{
            title: `Simulador de Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
            subtitle: data?.name ?? undefined,
            action: (
              <CarbonInventoryNavigationButton
                type={user ? "inventories" : "landing"}
                buttonProps={{
                  onClick: handleExitClick,
                  disabled: globalSubmitting || isBusy,
                  loading: isSubmittingAndGoingToList,
                }}
              />
            ),
          }}
          footerProps={{
            buttons: [backButton, nextButton],
          }}
          isLoading={isLoading}
        >
          <Box className="flex min-h-0 flex-1 flex-col">
            <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-scroll rounded-lg bg-white p-6">
              <StepHeader
                title="Paso 3: Completa los datos de tus fuentes de emisión"
                description="Ingresa la cantidad consumida o utilizada en cada fuente. Con esta información calcularemos automáticamente tus emisiones de CO₂e"
                explanationSlug={EMISSION_CAPTURE_EXPLANATION_SLUGS.MAIN}
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddRounded />}
                    onClick={handleOpenAddSubcategoryModal}
                    disabled={globalSubmitting || isBusy}
                    loading={isSubmittingBeforeModal}
                  >
                    Gestionar Subcategorías
                  </Button>
                }
              />
              <CategoryCarousel
                categories={data?.categories ?? []}
                selectedCategoryId={selectedCategory}
                onCategorySelect={handleCategoryChangeWithSave}
              />
              {selectedCategoryData && (
                <>
                  <TotalCategoryEmissionCard category={selectedCategoryData} />
                  <Box className="flex min-h-0 flex-1 flex-col gap-4">
                    {selectedCategoryData.subcategories.map((subcategory) => {
                      const formSubcategory =
                        watchedSubcategories?.[subcategory.id];
                      if (!shouldShowSubcategory(subcategory, formSubcategory))
                        return null;
                      return (
                        <EmissionEditor
                          key={subcategory.id}
                          categoryColor={selectedCategoryData.color}
                          subcategory={subcategory}
                          inventoryUsageMode={
                            data?.usageMode ?? UsageMode.SIMPLIFIED
                          }
                        />
                      );
                    })}
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
      {IS_DEVELOPMENT && <DevTool control={methods.control} />}
      <ExitInventoryDialog {...dialogProps} />
      {isAddSubcategoryModalOpen && (
        <AddSubcategoryModal
          open={isAddSubcategoryModalOpen}
          onClose={() => setIsAddSubcategoryModalOpen(false)}
          inventoryId={inventoryId}
        />
      )}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onClose={confirmDialog.closeConfirm}
        onConfirm={handleWarningConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
      />
    </FormProvider>
  );
};
