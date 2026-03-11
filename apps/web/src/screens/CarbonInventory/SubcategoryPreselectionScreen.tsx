import { FC, Fragment } from "react";
import { Box, Divider } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { CarbonInventoryLayout, FooterButton } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { useSubcategoryPreselectionData } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionSubmit";
import { useSubcategoryPreselectionNavigation } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionNavigation";
import { SubcategoryPreselectionField } from "./components";
import { CategoryCard } from "./components/CategoryCard";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import { IS_DEVELOPMENT } from "@/config/environment";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useCarbonInventory } from "@/api/query";
import { useInventoryEditGuard } from "./hooks/useInventoryEditGuard";

const ERROR_MESSAGE = {
  title:
    "Hubo un error cargando las categorías y subcategorías para su huella.",
  description:
    "Por favor, pruebe a recargar la página nuevamente o intente más tarde.",
  retryButtonText: "Recargar Página",
} as const;

export const SubcategoryPreselectionScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION,
  });

  const { data: existingInventory } = useCarbonInventory(inventoryId);
  const { isReady, mustNavigateAway } = useInventoryEditGuard(
    inventoryId,
    existingInventory?.status
  );

  const { data } = useEmissionCaptureData({
    inventoryId,
  });

  const {
    data: categories,
    isLoading: isSubcategoryPreselectionLoading,
    hasError,
  } = useSubcategoryPreselectionData(inventoryId);

  const { goBack, goNext } = useSubcategoryPreselectionNavigation(inventoryId);

  const methods = useSubcategoryPreselectionForm({
    data: categories,
  });
  const {
    handleSubmit,
    formState: { isDirty },
  } = methods;

  const { submit, isSubmitting } = useSubcategoryPreselectionSubmit(
    inventoryId,
    { onSuccess: goNext }
  );

  const isLoading = isSubcategoryPreselectionLoading || !isReady;

  if (!isLoading && mustNavigateAway) return null;

  const isFormDisabled = isSubmitting || hasError || isLoading;

  const backButton: FooterButton = {
    text: "Volver",
    align: "right",
    buttonProps: {
      startIcon: <ArrowRightAltRounded className="-scale-x-100" />,
      disabled: isSubmitting,
      onClick: goBack,
    },
  };

  const nextButton: FooterButton = {
    text: "Siguiente",
    align: "right",
    buttonProps: {
      endIcon: <ArrowRightAltRounded />,
      variant: "contained",
      type: "submit",
      form: "subcategory-preselection-form",
      loading: isSubmitting,
      disabled: isFormDisabled,
    },
  };

  return (
    <FormProvider {...methods}>
      <form
        id="subcategory-preselection-form"
        onSubmit={handleSubmit((values) => submit(values, isDirty))}
        noValidate
      >
        <CarbonInventoryLayout
          headerProps={{
            title: "Simulador de Inventario Organizacional",
            subtitle: data?.name ?? undefined,
          }}
          footerProps={{
            buttons: [backButton, nextButton],
          }}
          isLoading={isLoading}
          hasError={hasError}
          errorMessage={ERROR_MESSAGE}
        >
          <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto rounded-lg bg-white p-6">
            <StepHeader
              title="Paso 2: Fuentes o actividades sugeridas"
              description="Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu empresa."
            />
            <Box className="flex min-h-0 flex-1 flex-row gap-4 overflow-x-auto">
              {categories.map((category) => (
                <Box
                  key={category.id}
                  className="flex min-w-[300px] flex-1 flex-col items-start overflow-hidden p-4"
                  sx={{
                    border: `1px solid #ECECEC`,
                    borderRadius: `16px`,
                  }}
                >
                  {/* Header */}
                  <CategoryCard
                    position={category.position as 1 | 2 | 3}
                    subtitle={category.synonyms || ""}
                    title={category.name}
                    description={category.description || ""}
                    explanationId={category.explanationId}
                  />
                  {/*  Body */}
                  <Divider className="w-full pt-4" />

                  <Box className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto">
                    {category.subcategories.map((subcategory) => (
                      <Fragment key={subcategory.id}>
                        <SubcategoryPreselectionField
                          subcategory={subcategory}
                        />
                        <Divider className="w-full" />
                      </Fragment>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
      {IS_DEVELOPMENT && <DevTool control={methods.control} />}
    </FormProvider>
  );
};
