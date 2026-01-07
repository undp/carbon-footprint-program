import { FC, useMemo, useState, useEffect } from "react";
import { CarbonInventoryLayout } from "./layout";
import { Box } from "@mui/material";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Routes } from "../../interfaces";
import { StepHeader } from "./components/StepHeader";
import { CategoryCard } from "./components/CategoryCard";
import { SubcategoryContainer } from "./components/Subcategory/SubcategoryContainer";
import { useCarbonInventory, useMethodology } from "../../api/query";
import { useCarbonInventoryState } from "./hooks/useCarbonInventoryState";
import { round } from "lodash-es";
import { TotalCategoryEmissionCard } from "./components/TotalCategoryEmissionCard";

export const EmissionCaptureScreen: FC = () => {
  const { inventoryId } = useParams({
    from: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
  });
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<string>("1");

  const { data: methodology, isLoading: isLoadingMethodology } =
    useMethodology(inventoryId);
  const { data: inventory, isLoading: isLoadingInventory } =
    useCarbonInventory(inventoryId);

  const initializeSubcategory = useCarbonInventoryState(
    (state) => state.initializeSubcategory
  );

  const subcategoriesByCategory = useMemo(
    () =>
      new Map(
        methodology?.categories.map(({ id, subcategories }) => [
          id,
          subcategories,
        ])
      ),
    [methodology]
  );

  const selectedCategoryData = useMemo(
    () => methodology?.categories.find((cat) => cat.id === selectedCategory),
    [methodology, selectedCategory]
  );

  // Calcular total de emisiones por categoría
  const allSubcategories = useCarbonInventoryState(
    (state) => state.subcategories
  );

  const totalCategoryEmissions = useMemo(() => {
    const subcategoriesInCategory =
      subcategoriesByCategory.get(selectedCategory) || [];

    return (
      subcategoriesInCategory?.reduce((total, subcategory) => {
        const subcategoryState = allSubcategories[subcategory.id];
        if (!subcategoryState) return total;

        if (subcategoryState.isTotalManualEmissionsMode) {
          return total + (subcategoryState.totalEmission || 0);
        }

        const linesTotal =
          subcategoryState.lines?.reduce((lineTotal, line) => {
            const quantity = line.quantity || 0;
            const factorValue = line.factorValue || 0;
            return lineTotal + quantity * factorValue;
          }, 0) || 0;

        return total + linesTotal;
      }, 0) || 0
    );
  }, [subcategoriesByCategory, selectedCategory, allSubcategories]);

  // Inicializar el store con los datos del inventario
  useEffect(() => {
    if (inventory?.subcategories) {
      inventory.subcategories.forEach((subcategory) => {
        initializeSubcategory(subcategory.id, subcategory.lines || []);
      });
    }
  }, [inventory, initializeSubcategory]);

  const isLoading = isLoadingMethodology || isLoadingInventory;

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
                    onClick={() => setSelectedCategory(category.id)}
                  />
                ))}
              </Box>
              {selectedCategoryData && (
                <TotalCategoryEmissionCard
                  category={selectedCategoryData}
                  categoryEmissions={round(totalCategoryEmissions, 2)}
                />
              )}
              <Box className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-scroll">
                {(subcategoriesByCategory.get(selectedCategory) || []).map(
                  (subcategory) => (
                    <SubcategoryContainer
                      key={subcategory.name}
                      categoryPosition={Number(selectedCategory)}
                      subcategory={subcategory}
                      lines={
                        inventory?.subcategories.find(
                          (sc) => sc.id === subcategory.id
                        )?.lines || []
                      }
                    />
                  )
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </CarbonInventoryLayout>
  );
};
