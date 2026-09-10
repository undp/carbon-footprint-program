import { partition } from "lodash-es";
import { useMemo } from "react";
import { useCarbonInventoryMethodology } from "@/api/query/carbonInventories/methodologies/useCarbonInventoryMethodology";
import { useCarbonInventorySubcategoriesSummary } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategoriesSummary";
import { useCarbonInventorySubcategoryRecommendations } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategoryRecommendations";
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

  const { data: recommendations } =
    useCarbonInventorySubcategoryRecommendations(inventoryId);

  const mergedData = useMemo<SubcategoryPreselectionMergedData>(() => {
    if (!methodology || !subcategoriesSummary) return [];

    const subcategoriesSummaryMap = new Map(
      subcategoriesSummary.map((subcategorySummary) => [
        subcategorySummary.subcategoryId,
        subcategorySummary,
      ])
    );

    const recommendedIds = recommendations ?? [];

    return methodology.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      description: category.description,
      synonyms: category.synonyms,
      position: category.position,
      explanation: category.explanation,
      // The API already returns the subcategories in GHG order, and both
      // groups have to keep it. A partition says that outright: sorting on
      // `isRecommended` alone would leave the order inside each group riding
      // on the sort being stable, which nothing here states or tests.
      subcategories: partition(
        category.subcategories.map((subcategory) => {
          const summary = subcategoriesSummaryMap.get(subcategory.id);
          return {
            id: subcategory.id,
            name: subcategory.name,
            description: subcategory.description,
            explanation: subcategory.explanation,
            included: !!summary?.included,
            edited: !!summary?.edited,
            isRecommended: recommendedIds.includes(subcategory.id),
          };
        }),
        (subcategory) => subcategory.isRecommended
      ).flat(),
    }));
  }, [methodology, subcategoriesSummary, recommendations]);

  return {
    data: mergedData,
    isLoading: isMethodologyLoading || isSubcategoriesSummaryLoading,
    hasError: isMethodologyError || isSubcategoriesSummaryError,
  };
};
