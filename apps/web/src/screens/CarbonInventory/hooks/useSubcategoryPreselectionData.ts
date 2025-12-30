import { useMemo } from "react";
import { useMethodology } from "@/api/query/carbonInventories/methodologies/useMethodology";
import { useCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategories";
import { CategoryWithSubcategories, SubcategoryItem } from "./types";

export interface SubcategoryPreselectionData {
  categories: CategoryWithSubcategories[];
  isLoading: boolean;
  isError: boolean;
  methodologyName?: string;
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
    data: selectionData,
    isLoading: isSelectionLoading,
    isError: isSelectionError,
  } = useCarbonInventorySubcategories(inventoryId);

  const mergedData = useMemo<CategoryWithSubcategories[]>(() => {
    if (!methodology || !selectionData) return [];

    const selectionMap = new Map(
      selectionData.map((item) => [item.subcategoryId, item])
    );

    return methodology.categories.map((category, index) => {
      const subcategories: SubcategoryItem[] = category.subcategories.map(
        (subcategory) => {
          const idNum = Number(subcategory.id);
          const selectionInfo = selectionMap.get(idNum);
          const isSelected = selectionInfo?.selected ?? false;
          const hasEditedLine = selectionInfo?.hasEditedLine ?? false;
          const disabled = hasEditedLine;

          return {
            id: idNum,
            name: subcategory.name,
            description: subcategory.description,
            selected: isSelected,
            hasEditedLine,
            disabled,
          };
        }
      );

      return {
        ...category,
        order: index + 1,
        subcategories,
      } as CategoryWithSubcategories;
    });
  }, [methodology, selectionData]);

  return {
    categories: mergedData,
    isLoading: isMethodologyLoading || isSelectionLoading,
    isError: isMethodologyError || isSelectionError,
    methodologyName: methodology?.name,
  };
};
