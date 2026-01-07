import { useMemo } from "react";
import { useMethodology } from "@/api/query/carbonInventories/methodologies/useMethodology";
import { useCarbonInventorySubcategoriesSummary } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategoriesSummary";
import { CategoryWithSubcategories, SubcategoryItem } from "../types";

export interface SubcategoryPreselectionData {
  data: CategoryWithSubcategories[];
  isLoading: boolean;
  isError: boolean;
  hasError: boolean;
}

export const useSubcategoryPreselectionData = (
  inventoryId: string
): SubcategoryPreselectionData => {
  const {
    data: methodology,
    isLoading: isMethodologyLoading,
    isError: isMethodologyError,
  } = useMethodology(inventoryId);
  const {
    data: subcategoriesSummary,
    isLoading: isSubcategoriesSummaryLoading,
    isError: isSubcategoriesSummaryError,
  } = useCarbonInventorySubcategoriesSummary(inventoryId);

  const mergedData = useMemo<CategoryWithSubcategories[]>(() => {
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
      subcategories: category.subcategories.map((subcategory) => {
        const summary = subcategoriesSummaryMap.get(subcategory.id);
        return {
          id: subcategory.id,
          name: subcategory.name,
          description: subcategory.description,
          included: !!summary?.included,
          edited: !!summary?.edited,
        };
      }),
    }));
  }, [methodology, subcategoriesSummary]);

  const hasError = useMemo(() => {
    return isMethodologyError || isSubcategoriesSummaryError;
  }, [isMethodologyError, isSubcategoriesSummaryError]);

  return {
    data: mergedData,
    isLoading: isMethodologyLoading || isSubcategoriesSummaryLoading,
    isError: isMethodologyError || isSubcategoriesSummaryError,
    hasError,
  };
};
