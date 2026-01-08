import { FC, useState } from "react";
import { CarbonInventoryLayout } from "./layout";
import { Box, useTheme } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Routes } from "../../interfaces";
import { StepHeader } from "./components/StepHeader";
import { CategoryCard } from "./components/CategoryCard";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });
  const navigate = useNavigate();
  const theme = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<number>(1);

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: () =>
            navigate({
              to: Routes.CARBON_INVENTORY_SUBCATEGORY_PRESELECTION,
              params: { inventoryId },
            }),
        },
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col">
        <Box className="flex min-h-0 flex-1 flex-col gap-6 rounded-lg bg-white p-6">
          <StepHeader
            title="Paso 3: Completa los datos de tus fuentes de emisión"
            description="Ingresa la cantidad consumida o utilizada en cada fuente. Con esta información calcularemos automáticamente tus emisiones de CO₂e"
          />
          <Box className="flex flex-row gap-4">
            <CategoryCard
              position={1}
              variant={selectedCategory === 1 ? "focused" : "unfocused"}
              title="Alcance 1"
              subtitle="Categoria 1 / Alcance 1"
              description="Generadas dentro de tu empresa"
              onClick={() => setSelectedCategory(1)}
            />
            <CategoryCard
              position={2}
              variant={selectedCategory === 2 ? "focused" : "unfocused"}
              title="Alcance 2"
              subtitle="Categoria 2 / Alcance 2"
              description="Generadas por la electricidad consumida"
              onClick={() => setSelectedCategory(2)}
            />
            <CategoryCard
              position={3}
              variant={selectedCategory === 3 ? "focused" : "unfocused"}
              title="Alcance 3"
              subtitle="Categorias 3,4,5 y 6 / Alcance 3"
              description="Generadas fuera de tu empresa"
              onClick={() => setSelectedCategory(3)}
            />
          </Box>
          <Box
            className="flex min-h-0 flex-1 flex-col"
            sx={{
              border: `1px solid ${theme.palette.category[selectedCategory].main}`,
              borderRadius: "8px",
            }}
          ></Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
