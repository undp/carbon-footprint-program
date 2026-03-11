import { useMemo } from "react";
import { useCarbonInventoryMethodology } from "@/api/query/carbonInventories/methodologies/useCarbonInventoryMethodology";
import { useCarbonInventorySubcategoriesSummary } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategoriesSummary";
import { SubcategoryPreselectionMergedData } from "../types";

export interface UseSubcategoryPreselectionDataResult {
  data: SubcategoryPreselectionMergedData;
  isLoading: boolean;
  hasError: boolean;
}

export const useSubcategoryPreselectionData = (
  inventoryId: string
): UseSubcategoryPreselectionDataResult => {
  const {
    data: methodology,
    isLoading: isMethodologyLoading,
    isError: isMethodologyError,
  } = useCarbonInventoryMethodology(inventoryId);
  const {
    data: subcategoriesSummary,
    isLoading: isSubcategoriesSummaryLoading,
    isError: isSubcategoriesSummaryError,
  } = useCarbonInventorySubcategoriesSummary(inventoryId);

  const mergedData = useMemo<SubcategoryPreselectionMergedData>(() => {
    if (!methodology || !subcategoriesSummary) return [];

    const subcategoriesSummaryMap = new Map(
      subcategoriesSummary.map((subcategorySummary) => [
        subcategorySummary.subcategoryId,
        subcategorySummary,
      ])
    );

    return methodology.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      synonyms: category.synonyms,
      position: category.position,
      explanationId: category.explanationId,
      subcategories: category.subcategories.map((subcategory) => {
        const summary = subcategoriesSummaryMap.get(subcategory.id);
        return {
          id: subcategory.id,
          name: subcategory.name,
          description: subcategory.description,
          explanationId: subcategory.explanationId,
          included: !!summary?.included,
          edited: !!summary?.edited,
        };
      }),
    }));
  }, [methodology, subcategoriesSummary]);

  return {
    data: mergedData,
    isLoading: isMethodologyLoading || isSubcategoriesSummaryLoading,
    hasError: isMethodologyError || isSubcategoriesSummaryError,
  };
};
