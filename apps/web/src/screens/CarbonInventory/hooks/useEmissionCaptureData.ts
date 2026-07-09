import { useMemo } from "react";
import { useCarbonInventory, useCarbonInventoryMethodology } from "@/api/query";
import { EmissionCaptureMergedData } from "../types/EmissionCaptureTypes";

interface UseEmissionCaptureDataParams {
  inventoryId: string;
}

export interface UseEmissionCaptureDataResult {
  data: EmissionCaptureMergedData;
  isLoading: boolean;
}

export const useEmissionCaptureData = ({
  inventoryId,
}: UseEmissionCaptureDataParams): UseEmissionCaptureDataResult => {
  const { data: methodology, isLoading: isLoadingMethodology } =
    useCarbonInventoryMethodology(inventoryId);
  const { data: inventory, isLoading: isLoadingInventory } =
    useCarbonInventory(inventoryId);

  // Merge methodology and inventory data similar to useSubcategoryPreselectionData
  const mergedData = useMemo<EmissionCaptureMergedData>(() => {
    if (!methodology || !inventory) return null;

    // Create a map of inventory subcategories by id for quick lookup
    const inventorySubcategoriesMap = new Map(
      inventory?.subcategories.map((subcategory) => [
        subcategory.id,
        subcategory,
      ]) || []
    );

    return {
      year: inventory?.year || null,
      name: inventory?.name || null,
      usageMode: inventory?.usageMode || null,
      categories: methodology.categories.map((category) => ({
        ...category,
        subcategories: category.subcategories.map((subcategory) => {
          const inventorySubcategory = inventorySubcategoriesMap.get(
            subcategory.id
          );

          return {
            ...subcategory,
            lines: (inventorySubcategory?.lines || []).map((line) => ({
              ...line,
              lineId: line.id,
              baseFactorId: null,
              files: line.files ?? [],
              removedFileIds: [],
            })),
            isTotalManualEmissionsModeAvailable:
              inventorySubcategory?.isTotalManualEmissionsModeAvailable ??
              false,
            isTotalManualEmissionsModeActive:
              inventorySubcategory?.isTotalManualEmissionsModeActive ?? false,
          };
        }),
      })),
    };
  }, [methodology, inventory]);

  return {
    data: mergedData,
    isLoading: isLoadingMethodology || isLoadingInventory,
  };
};
