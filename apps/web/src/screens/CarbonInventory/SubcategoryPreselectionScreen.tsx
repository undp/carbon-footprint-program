import { FC, Fragment } from "react";
import { Box, Divider } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { useSubcategoryPreselectionData } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionData";
import { useSubcategoryPreselectionForm } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionForm";
import { useSubcategoryPreselectionSubmit } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionSubmit";
import { useSubcategoryPreselectionNavigation } from "@/screens/CarbonInventory/hooks/useSubcategoryPreselectionNavigation";
import { SubcategoryField } from "./components/SubcategoryPreselectionCardField";
import { CategoryCard } from "./components/CategoryCard";

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

  const {
    data: categories,
    isLoading,
    hasError,
  } = useSubcategoryPreselectionData(inventoryId);

  const { goBack, goNext } = useSubcategoryPreselectionNavigation(inventoryId);

  const methods = useSubcategoryPreselectionForm({
    categories,
  });
  const { handleSubmit } = methods;

  const { submit, isSubmitting } = useSubcategoryPreselectionSubmit(
    inventoryId,
    { onSuccess: goNext }
  );

  const isFormDisabled = isSubmitting || hasError || isLoading;

  return (
    <FormProvider {...methods}>
      <form
        id="subcategory-preselection-form"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        <CarbonInventoryLayout
          headerProps={{
            title: "Simulador de Inventario Organizacional",
          }}
          footerProps={{
            backButtonProps: {
              disabled: isSubmitting,
              onClick: goBack,
            },
            nextButtonProps: {
              type: "submit",
              form: "subcategory-preselection-form",
              loading: isSubmitting,
              disabled: isFormDisabled,
            },
          }}
          isLoading={isLoading}
          hasError={hasError}
          errorMessage={ERROR_MESSAGE}
        >
          <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto rounded-lg bg-white p-6">
            <StepHeader
              title="Paso 2: Fuentes o actividades sugeridas"
              description="Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu empresa."
            />
            <Box className="flex min-h-0 flex-1 flex-row gap-4 overflow-x-auto">
              {categories.map((category) => (
                <Box
                  key={category.id}
                  className="flex min-w-[300px] flex-1 flex-col items-start gap-4 overflow-hidden p-4"
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
                  />
                  {/*  Body */}
                  <Divider className="w-full" />

                  <Box className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-y-auto">
                    {category.subcategories.map((subcategory) => (
                      <Fragment key={subcategory.id.toString()}>
                        <SubcategoryField
                          name={String(subcategory.id)}
                          emission={{
                            id: subcategory.id,
                            name: subcategory.name,
                            description: subcategory.description,
                          }}
                          disabled={subcategory.edited}
                        />
                        <Divider className="w-full" />
                      </Fragment>
                    ))}
                    {category.subcategories.length === 0 && (
                      <Box className="p-4 text-center text-gray-500">
                        No hay subcategorías disponibles.
                      </Box>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </CarbonInventoryLayout>
      </form>
    </FormProvider>
  );
};
