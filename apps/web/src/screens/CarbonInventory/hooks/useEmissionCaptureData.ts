import { useMemo, useEffect } from "react";
import { round } from "lodash-es";
import { useCarbonInventory, useCarbonInventoryMethodology } from "@/api/query";
import { useCarbonInventoryState } from "./useCarbonInventoryState";

interface UseEmissionCaptureDataParams {
  inventoryId: string;
  selectedCategory: string;
}

export const useEmissionCaptureData = ({
  inventoryId,
  selectedCategory,
}: UseEmissionCaptureDataParams) => {
  const { data: methodology, isLoading: isLoadingMethodology } =
    useCarbonInventoryMethodology(inventoryId);
  const { data: inventory, isLoading: isLoadingInventory } =
    useCarbonInventory(inventoryId);

  const initializeSubcategory = useCarbonInventoryState(
    (state) => state.initializeSubcategory
  );
  const allSubcategories = useCarbonInventoryState(
    (state) => state.subcategories
  );

  // Map of subcategories by category
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

  // Selected category data
  const selectedCategoryData = useMemo(
    () => methodology?.categories.find((cat) => cat.id === selectedCategory),
    [methodology, selectedCategory]
  );

  // Total emissions calculation by category
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

  // Initialize the store with the inventory data
  useEffect(() => {
    if (inventory?.subcategories) {
      inventory.subcategories.forEach((subcategory) => {
        initializeSubcategory(subcategory.id, subcategory.lines || []);
      });
    }
  }, [inventory, initializeSubcategory]);

  return useMemo(
    () => ({
      methodology,
      inventory,
      subcategoriesByCategory,
      selectedCategoryData,
      totalCategoryEmissions: round(totalCategoryEmissions, 2),
      isLoading: isLoadingMethodology || isLoadingInventory,
    }),
    [
      methodology,
      inventory,
      subcategoriesByCategory,
      selectedCategoryData,
      totalCategoryEmissions,
      isLoadingMethodology,
      isLoadingInventory,
    ]
  );
};
