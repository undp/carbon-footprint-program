import { FC, useMemo, useEffect } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
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
import { ArrowRightAltRounded, SaveRounded } from "@mui/icons-material";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });

  const { selectedCategory, handleCategoryChange } =
    useEmissionCaptureCategory();

  const { data, isLoading } = useEmissionCaptureData({
    inventoryId,
  });

  const { goBack, goNext } = useEmissionCaptureNavigation(inventoryId);

  const activeActionsCount = useEmissionCaptureState(
    (state) => state.activeActionsCount
  );
  const subcategoryTotals = useEmissionCaptureState(
    (state) => state.subcategoryTotals
  );
  const resetStore = useEmissionCaptureState((state) => state.reset);

  // Form setup
  const methods = useEmissionCaptureForm({ data });
  const { handleSubmit, formState } = methods;

  const { submit, isSubmitting } = useEmissionCaptureSubmit({
    inventoryId,
    onSuccess: goNext,
    isDirty: formState.isDirty,
  });

  const { submit: submitAndNavigate, isSubmitting: isSubmitting2 } =
    useEmissionCaptureSubmit({
      inventoryId,
      isDirty: formState.isDirty,
    });

  const selectedCategoryData = useMemo(
    () => data?.categories.find((category) => category.id === selectedCategory),
    [data, selectedCategory]
  );

  // Calculate total emissions for the selected category based on subcategory totals in store
  const categoryEmissions = useMemo(() => {
    if (!selectedCategoryData) return 0;
    const total = selectedCategoryData.subcategories.reduce(
      (acc, subcategory) => {
        const subcatTotal = subcategoryTotals[subcategory.id] || 0;
        return acc + subcatTotal;
      },
      0
    );
    return total;
  }, [selectedCategoryData, subcategoryTotals]);

  // Reset store on mount and unmount to avoid stale data
  useEffect(() => {
    resetStore();
    return () => resetStore();
  }, [resetStore]);

  const isBusy = activeActionsCount > 0;

  return (
    <FormProvider {...methods}>
      <form
        id="emission-capture-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
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
                text: "Guardar",
                align: "right",
                buttonProps: {
                  startIcon: <SaveRounded />,
                  variant: "contained",
                  onClick: handleSubmit(submitAndNavigate),
                  loading: isSubmitting2,
                  disabled: isSubmitting2 || isBusy,
                },
              },
              {
                text: "Siguiente",
                align: "right",
                buttonProps: {
                  endIcon: <ArrowRightAltRounded />,
                  variant: "contained",
                  type: "submit",
                  form: "emission-capture-form",
                  loading: isSubmitting,
                  disabled: isSubmitting || isBusy,
                },
              },
            ],
          }}
          isLoading={isLoading}
        >
          <Box className="flex min-h-0 flex-1 flex-col">
            <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-scroll rounded-lg bg-white p-6">
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
                    onClick={() => handleCategoryChange(category.id)}
                  />
                ))}
              </Box>
              {selectedCategoryData && (
                <TotalCategoryEmissionCard
                  category={selectedCategoryData}
                  categoryEmissions={categoryEmissions}
                />
              )}
              <Box className="flex min-h-0 flex-1 flex-col gap-4">
                {(
                  selectedCategoryData?.subcategories ||
                  ([] as SubcategoryWithLines[])
                ).map((subcategory) => {
                  if (
                    subcategory.lines.length === 0 &&
                    !subcategory.isTotalManualEmissionsMode
                  )
                    return null;
                  return (
                    <EmissionEditor
                      key={subcategory.id}
                      categoryPosition={Number(selectedCategory)}
                      subcategory={subcategory}
                    />
                  );
                })}
              </Box>
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
    </FormProvider>
  );
};
