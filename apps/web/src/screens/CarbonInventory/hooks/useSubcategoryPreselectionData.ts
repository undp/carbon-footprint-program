import { useMemo } from "react";
import { useMethodology } from "@/api/query/carbonInventories/methodologies/useMethodology";
import { useCarbonInventorySubcategoriesSummary } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategoriesSummary";
export interface SubcategoryItem {
  id: string;
  name: string;
  description?: string | null;
  included: boolean; // to check if the subcategory is included in the carbon inventory
  edited: boolean; // to disable the subcategory if it has been edited
}

export interface CategoriesWithSubcategories {
  id: string;
  name: string;
  description?: string | null;
  synonyms?: string | null;
  position: number;
  subcategories: SubcategoryItem[];
}

export interface SubcategoryPreselectionData {
  data: CategoriesWithSubcategories[];
  isLoading: boolean;
  isError: boolean;
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

  const mergedData = useMemo<CategoriesWithSubcategories[]>(() => {
    if (!methodology || !subcategoriesSummary) return [];

    const subcategoriesSummaryMap = new Map(
      subcategoriesSummary.map((subcategorySummary) => [
        subcategorySummary.subcategoryId,
        subcategorySummary,
      ])
    );

    return methodology.categories.map((category) => {
      const subcategories: SubcategoryItem[] = category.subcategories.map(
        (subcategory) => {
          const subcategorySummary = subcategoriesSummaryMap.get(
            subcategory.id
          );
          const included = subcategorySummary?.included ?? false;
          const edited = subcategorySummary?.edited ?? false;

          return {
            id: subcategory.id,
            name: subcategory.name,
            description: subcategory.description,
            included,
            edited,
          };
        }
      );

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        synonyms: category.synonyms,
        position: category.position,
        subcategories,
      };
    });
  }, [methodology, subcategoriesSummary]);

  return {
    data: mergedData,
    isLoading: isMethodologyLoading || isSubcategoriesSummaryLoading,
    isError: isMethodologyError || isSubcategoriesSummaryError,
  };
};
