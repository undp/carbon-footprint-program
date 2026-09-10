import { useMemo } from "react";
import { useCarbonInventory, useCarbonInventoryMethodology } from "@/api/query";
import { EmissionCaptureMergedData } from "../types/EmissionCaptureTypes";
import { resolveLegacyCatalogFactorId } from "../utils/legacyCatalogFactor";

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
              // Seeded from the saved snapshot so the selector reopens on the
              // exact catalog factor the organization chose. Leaving it null
              // would make the line look unselected and let the recommendation
              // silently replace a deliberate choice. A line saved before the
              // snapshot existed has no id to read, so its provider, value,
              // unit and dimensions are matched back to the catalog instead —
              // and left empty when they do not identify one factor.
              baseFactorId: resolveLegacyCatalogFactorId(
                line,
                subcategory.emissionFactors
              ),
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
