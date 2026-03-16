import { FC, useMemo, useCallback, useState } from "react";
import { Box, Button } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { FormProvider, useWatch } from "react-hook-form";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader, ExitInventoryDialog } from "./components";
import { useAuth } from "@/contexts";
import { CategoryCard } from "./components/CategoryCard";
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
import {
  ArrowForwardRounded,
  ArrowRightAltRounded,
  HomeOutlined,
  SaveRounded,
} from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import { UsageMode } from "@repo/types";
import { useCarbonInventory } from "@/api/query";
import { useInventoryEditGuard } from "./hooks/useInventoryEditGuard";
import { EXIT_DIALOG_CONTENT } from "./constants";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

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

  const { goBack, goNext } = useEmissionCaptureNavigation(inventoryId);

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

  const { submit: submitOnCategoryChange } = useEmissionCaptureSubmit({
    inventoryId,
    isDirty: formState.isDirty,
    getDirtyLineIds,
    resetAfterSave,
    showNoChangesMessage: false,
    resultFeedbackWithSnackbar: true,
  });

  const goToList = useCallback(
    () => void navigate({ to: Routes.CARBON_INVENTORIES }),
    [navigate]
  );
  const { submit: submitAndGoToList } = useEmissionCaptureSubmit({
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

  if (!isLoading && mustNavigateAway) return null;

  const handleExitClick = () => {
    if (user) {
      void handleSubmit(submitAndGoToList)();
    } else {
      setIsExitDialogOpen(true);
    }
  };

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      onClick: handleSubmit(submitAndGoBack),
      loading: isSubmittingAndGoingBack,
      disabled: isSubmittingAndGoingBack || isBusy,
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
          disabled: isSubmittingNoNavigating || isBusy,
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
          disabled: isSubmittingAndNavigating || isBusy,
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
            action: user ? (
              <Button
                variant="outlined"
                startIcon={<ArrowForwardRounded />}
                onClick={handleExitClick}
              >
                Ir a mis huellas
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<HomeOutlined />}
                onClick={handleExitClick}
              >
                Ir al inicio
              </Button>
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
              <Box className="flex flex-row gap-4">
                {data?.categories.map((category) => (
                  <CategoryCard
                    key={`category_${category.id}`}
                    position={category.position}
                    variant={
                      selectedCategory === category.id ? "focused" : "unfocused"
                    }
                    title={category.name}
                    subtitle={category.synonyms}
                    description={category.description}
                    explanationId={category.explanationId}
                    onClick={() => handleCategoryChangeWithSave(category.id)}
                  />
                ))}
              </Box>
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
                      categoryPosition={Number(selectedCategory)}
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
      <ExitInventoryDialog
        open={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
        onConfirm={() => void navigate({ to: Routes.LANDING })}
        {...EXIT_DIALOG_CONTENT.GUEST}
      />
    </FormProvider>
  );
};
