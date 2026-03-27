import { FC, useMemo, useCallback, useEffect } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { FormProvider, useWatch } from "react-hook-form";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import {
  StepHeader,
  ExitInventoryDialog,
  CarbonInventoryNavigationButton,
} from "./components";
import { useAuth } from "@/contexts";
import { CategoryCarousel } from "./components/CategoryCarousel";
import { EmissionEditor } from "./components/EmissionEditor";
import { TotalCategoryEmissionCard } from "./components/TotalCategoryEmissionCard";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useEmissionCaptureNavigation } from "./hooks/useEmissionCaptureNavigation";
import { useEmissionCaptureCategory } from "./hooks/useEmissionCaptureCategory";
import { useEmissionCaptureForm } from "./hooks/useEmissionCaptureForm";
import { useEmissionCaptureSubmit } from "./hooks/useEmissionCaptureSubmit";
import { useEmissionCaptureState } from "./hooks/useEmissionCaptureState";
import { SubcategoryWithLines } from "./types/EmissionCaptureTypes";
import { IS_DEVELOPMENT } from "@/config/environment";
import { ArrowRightAltRounded, SaveRounded } from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import { UsageMode } from "@repo/types";
import { useCarbonInventory } from "@/api/query";
import { useInventoryEditGuard } from "./hooks/useInventoryEditGuard";
import { useExitDialog } from "./hooks/useExitDialog";
import { useCommonNavigation } from "./hooks/useCommonNavigation";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });
  const { user } = useAuth();

  const { data: existingInventory } = useCarbonInventory(inventoryId);
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

  const activeActionsCount = useEmissionCaptureState(
    (state) => state.activeActionsCount
  );

  // Form setup
  const methods = useEmissionCaptureForm({ data });
  const { handleSubmit, formState, resetAfterSave, getDirtyLineIds } = methods;

  const { submit: submitAndNavigate, isSubmitting: isSubmittingAndNavigating } =
    useEmissionCaptureSubmit({
      inventoryId,
      onSuccess: goNext,
      isDirty: formState.isDirty,
      getDirtyLineIds,
      resetAfterSave,
      showNoChangesMessage: false,
    });

  const { submit: submitNoNavigate, isSubmitting: isSubmittingNoNavigating } =
    useEmissionCaptureSubmit({
      inventoryId,
      isDirty: formState.isDirty,
      getDirtyLineIds,
      resetAfterSave,
    });

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

  const selectedCategoryData = useMemo(
    () => data?.categories.find((category) => category.id === selectedCategory),
    [data, selectedCategory]
  );

  const isBusy = activeActionsCount > 0;

  const globalSubmitting =
    isSubmittingAndNavigating ||
    isSubmittingAndGoingToList ||
    isSubmittingAndGoingBack ||
    isSubmittingNoNavigating ||
    isSubmittingOnCategoryChange;

  const handleCategoryChangeWithSave = useCallback(
    (categoryId: string) => {
      void handleSubmit(async (data) => {
        await submitOnCategoryChange(data);
        handleCategoryChange(categoryId);
      })();
    },
    [handleSubmit, submitOnCategoryChange, handleCategoryChange]
  );

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
      onClick: handleSubmit(submitAndGoBack),
      loading: isSubmittingAndGoingBack,
      disabled: globalSubmitting || isBusy,
    },
  };

  const nextButton: FooterButton = formState.isDirty
    ? {
        text: "Guardar",
        align: "right",
        buttonProps: {
          startIcon: <SaveRounded />,
          variant: "contained",
          onClick: handleSubmit(submitNoNavigate),
          loading: isSubmittingNoNavigating,
          disabled: globalSubmitting || isBusy,
        },
      }
    : {
        text: "Siguiente",
        align: "right",
        buttonProps: {
          endIcon: <ArrowRightAltRounded />,
          variant: "contained",
          type: "submit",
          form: "emission-capture-form",
          loading: isSubmittingAndNavigating,
          disabled: globalSubmitting || isBusy,
        },
      };

  return (
    <FormProvider {...methods}>
      <form
        id="emission-capture-form"
        onSubmit={handleSubmit(submitAndNavigate)}
        noValidate
      >
        <CarbonInventoryLayout
          headerProps={{
            title: "Simulador de Inventario Organizacional",
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
              />
              <CategoryCarousel
                categories={data?.categories ?? []}
                selectedCategoryId={selectedCategory}
                onCategorySelect={handleCategoryChangeWithSave}
              />
              {selectedCategoryData && (
                <TotalCategoryEmissionCard category={selectedCategoryData} />
              )}
              <Box className="flex min-h-0 flex-1 flex-col gap-4">
                {(
                  selectedCategoryData?.subcategories ||
                  ([] as SubcategoryWithLines[])
                ).map((subcategory) => {
                  const formSubcategory =
                    watchedSubcategories?.[subcategory.id];
                  const allLinesDeleted = Object.values(
                    formSubcategory?.lines ?? {}
                  ).every(({ isDeleted }) => isDeleted);

                  if (
                    formSubcategory?.isTotalManualEmissionsModeActive &&
                    allLinesDeleted
                  )
                    return null;

                  if (
                    subcategory.lines.length === 0 &&
                    !subcategory.isTotalManualEmissionsModeActive
                  )
                    return null;
                  return (
                    <EmissionEditor
                      key={subcategory.id}
                      categoryColor={selectedCategoryData!.color}
                      subcategory={subcategory}
                      inventoryUsageMode={
                        data?.usageMode ?? UsageMode.SIMPLIFIED
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
      {IS_DEVELOPMENT && <DevTool control={methods.control} />}
      <ExitInventoryDialog {...dialogProps} />
    </FormProvider>
  );
};
