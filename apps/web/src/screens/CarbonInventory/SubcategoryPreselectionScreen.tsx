import { FC } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { SubcategoryPreselectionCard } from "./components/SubcategoryPreselectionCard";
import { useSubcategoryPreselectionData } from "./hooks/useSubcategoryPreselectionData";
import { useCategoryStyles } from "./hooks/useCategoryStyles";
import { useSubcategoryPreselectionForm } from "./hooks/useSubcategoryPreselectionForm";
import { CategoryWithSubcategories } from "./hooks/types";

export const SubcategoryPreselectionScreen: FC = () => {
  const navigate = useNavigate();
  const categoryStyles = useCategoryStyles();
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION,
  });

  const { categories, isLoading, isError } =
    useSubcategoryPreselectionData(inventoryId);

  const hasError = isError || (!isLoading && categories.length === 0);

  const goNext = () =>
    void navigate({
      to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
      params: { inventoryId },
    });

  const { methods, onSubmit, isSubmitting } = useSubcategoryPreselectionForm({
    inventoryId,
    categories,
    onSuccess: goNext,
  });

  return (
    <FormProvider {...methods}>
      <form
        id="subcategory-preselection-form"
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onSubmit={onSubmit}
        noValidate
      >
        <CarbonInventoryLayout
          headerProps={{
            title: "Simulador de Inventario Organizacional",
          }}
          footerProps={{
            backButtonProps: {
              disabled: isSubmitting,
              onClick: () =>
                void navigate({
                  to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
                  params: { inventoryId },
                }),
            },
            nextButtonProps: {
              type: "submit",
              form: "subcategory-preselection-form",
              loading: isSubmitting,
              disabled: isSubmitting || hasError || isLoading,
            },
          }}
        >
          <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto rounded-lg bg-white p-4">
            <StepHeader
              title="Paso 2: Fuentes o actividades sugeridas"
              description="Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu empresa."
              action={
                <Button
                  variant="outlined"
                  color="primary"
                  disabled={hasError || isLoading}
                >
                  Agregar Nueva Fuente
                </Button>
              }
            />
            {isLoading && (
              <Box className="flex min-h-0 flex-1 items-center justify-center">
                <CircularProgress />
              </Box>
            )}

            {!isLoading && hasError && (
              <Box className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <Typography variant="h5" color="text.primary" fontWeight="bold">
                  Hubo un error cargando las categorías y subcategorías para su
                  huella.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ maxWidth: 600 }}
                >
                  Por favor, pruebe a recargar la página nuevamente o intente
                  más tarde.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => window.location.reload()}
                  sx={{ mt: 2 }}
                >
                  Recargar Página
                </Button>
              </Box>
            )}

            {!isLoading && !hasError && (
              <Box className="flex min-h-0 flex-1 flex-row gap-6 overflow-x-auto">
                {categories.map((category: CategoryWithSubcategories) => {
                  const style =
                    categoryStyles[
                      category.order as keyof typeof categoryStyles
                    ] || categoryStyles[1];
                  return (
                    <SubcategoryPreselectionCard
                      key={category.id}
                      category={category}
                      icon={style.icon}
                      label={style.label}
                      color={style.color}
                    />
                  );
                })}
              </Box>
            )}
          </Box>
        </CarbonInventoryLayout>
      </form>
    </FormProvider>
  );
};
