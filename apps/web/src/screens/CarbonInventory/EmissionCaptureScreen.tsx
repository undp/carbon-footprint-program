import { FC } from "react";
import { Box } from "@mui/material";
import { useParams } from "@tanstack/react-router";
import { CarbonInventoryLayout } from "./layout";
import { Routes } from "@/interfaces";
import { StepHeader } from "./components/StepHeader";
import { CategoryCard } from "./components/CategoryCard";
import { SubcategoryContainer } from "./components/Subcategory/SubcategoryContainer";
import { TotalCategoryEmissionCard } from "./components/TotalCategoryEmissionCard";
import { useEmissionCaptureData } from "./hooks/useEmissionCaptureData";
import { useEmissionCaptureNavigation } from "./hooks/useEmissionCaptureNavigation";
import { useEmissionCaptureCategory } from "./hooks/useEmissionCaptureCategory";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });

  const { selectedCategory, handleCategoryChange } =
    useEmissionCaptureCategory();

  const {
    methodology,
    inventory,
    subcategoriesByCategory,
    selectedCategoryData,
    totalCategoryEmissions,
    isLoading,
  } = useEmissionCaptureData({
    inventoryId,
    selectedCategory,
  });

  const { goBack } = useEmissionCaptureNavigation(inventoryId);

  return (
    <CarbonInventoryLayout
      headerProps={{
        title: "Simulador de Inventario Organizacional",
      }}
      footerProps={{
        backButtonProps: {
          onClick: goBack,
        },
      }}
    >
      <Box className="flex min-h-0 flex-1 flex-col">
        <Box className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-scroll rounded-lg bg-white p-6">
          <StepHeader
            title="Paso 3: Completa los datos de tus fuentes de emisión"
            description="Ingresa la cantidad consumida o utilizada en cada fuente. Con esta información calcularemos automáticamente tus emisiones de CO₂e"
          />
          {isLoading ? (
            <div>Loading categories...</div>
          ) : (
            <>
              <Box className="flex flex-row gap-4">
                {methodology?.categories.map((category) => (
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
                  categoryEmissions={totalCategoryEmissions}
                />
              )}
              <Box className="flex min-h-0 flex-1 flex-col gap-4">
                {(subcategoriesByCategory.get(selectedCategory) || []).map(
                  (subcategory) => {
                    // TODO: maybe we should use a hook for building the merged data
                    const lines =
                      inventory?.subcategories.find(
                        (sc) => sc.id === subcategory.id
                      )?.lines || [];
                    if (lines.length === 0) return null;
                    return (
                      <SubcategoryContainer
                        key={subcategory.name}
                        categoryPosition={Number(selectedCategory)}
                        subcategory={subcategory}
                        lines={lines}
                      />
                    );
                  }
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
