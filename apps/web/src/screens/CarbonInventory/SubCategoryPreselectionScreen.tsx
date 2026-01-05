import { FC } from "react";
import { Box, Button } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { CategoryCard } from "./components";

export const SubCategoryPreselectionScreen: FC = () => {
  const navigate = useNavigate();
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_SUB_CATEGORY_PRESELECTION,
  });

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: () =>
            void navigate({
              to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
              params: { inventoryId },
            }),
        },
        nextButtonProps: {
          onClick: () =>
            void navigate({
              to: Routes.CARBON_INVENTORY_EMISSION_CAPTURE as string,
              params: { inventoryId },
            }),
        },
      }}
    >
      <Box className="flex flex-1 flex-col gap-6">
        <Box className="flex flex-col gap-6 rounded-lg bg-white p-6">
          <StepHeader
            title="Paso 2: Preselección de subcategorías"
            description="Estas son las principales fuentes de emisión que te recomendamos medir según tu rubro. Marca y/o desmarca las que aplican a tu empresa."
            action={
              <Button variant="outlined" color="primary">
                Agregar Nueva Fuente
              </Button>
            }
          />
          <Box className="flex flex-row gap-4">
            <Box className="flex flex-1 flex-col gap-8">
              <CategoryCard
                position={1}
                title="Alcance 1"
                subtitle="Categoria 1 / Alcance 1"
                description="Generadas dentro de tu empresa"
              />
            </Box>
            <Box className="flex flex-1 flex-col gap-8">
              <CategoryCard
                position={2}
                title="Alcance 2"
                subtitle="Categoria 2 / Alcance 2"
                description="Generadas por la electricidad consumida"
              />
            </Box>
            <Box className="flex flex-1 flex-col gap-8">
              <CategoryCard
                position={3}
                title="Alcance 3"
                subtitle="Categorias 3,4,5 y 6 / Alcance 3"
                description="Generadas fuera de tu empresa"
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
