import { FC, useMemo } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { CategoryCard } from "./components/CategoryCard";
import { EmissionEditor } from "./components/EmissionEditor";
import { TotalCategoryEmissionCard } from "./components/TotalCategoryEmissionCard";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useEmissionCaptureNavigation } from "./hooks/useEmissionCaptureNavigation";
import { useEmissionCaptureCategory } from "./hooks/useEmissionCaptureCategory";
import { SubcategoryWithLines } from "./types/EmissionCaptureTypes";

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

  const selectedCategoryData = useMemo(
    () => data.find((category) => category.id === selectedCategory),
    [data, selectedCategory]
  );

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: goBack,
        },
        nextButtonProps: {
          onClick: goNext,
        },
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
            {data.map((category) => (
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
              categoryEmissions={0}
            />
          )}
          <Box className="flex min-h-0 flex-1 flex-col gap-4">
            {(
              selectedCategoryData?.subcategories ||
              ([] as SubcategoryWithLines[])
            ).map((subcategory) => {
              if (subcategory.lines.length === 0) return null;
              return (
                <EmissionEditor
                  key={subcategory.name}
                  categoryPosition={Number(selectedCategory)}
                  subcategory={subcategory}
                  lines={subcategory.lines}
                />
              );
            })}
          </Box>
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
