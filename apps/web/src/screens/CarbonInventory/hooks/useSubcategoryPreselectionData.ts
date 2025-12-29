import { useMemo } from "react";
import { useMethodology } from "@/api/query/carbonInventories/methodologies/useMethodology";
import { useCarbonInventorySubcategories } from "@/api/query/carbonInventories/subcategories/useCarbonInventorySubcategories";

export type SubcategoryItem = {
  id: number;
  name: string;
  description?: string;
  selected: boolean;
  hasEditedLine: boolean;
  disabled: boolean;
};

export type CategoryWithSubcategories = {
  id: string;
  name: string;
  description: string;
  synonyms: string;
  order: number;
  subcategories: SubcategoryItem[];
  color?: string;
};

export interface SubcategoryPreselectionData {
  categories: CategoryWithSubcategories[];
  isLoading: boolean;
  isError: boolean;
  initialValues: Record<string, boolean>;
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

    return methodology.categories.map((category) => {
      const subcategories: SubcategoryItem[] = category.subcategories.map(
        (sub) => {
          const idNum = Number(sub.id);
          const selectionInfo = selectionMap.get(idNum);
          const isSelected = selectionInfo?.selected ?? false;
          const hasEditedLine = selectionInfo?.hasEditedLine ?? false;
          const disabled = hasEditedLine;

          return {
            id: idNum,
            name: sub.name,
            description: sub.description,
            selected: isSelected,
            hasEditedLine,
            disabled,
          };
        }
      );

      return {
        ...category,
        subcategories,
      } as CategoryWithSubcategories;
    });
  }, [methodology, selectionData]);

  const initialValues = useMemo(() => {
    const values: Record<string, boolean> = {};
    mergedData.forEach((cat: CategoryWithSubcategories) => {
      cat.subcategories.forEach((sub: SubcategoryItem) => {
        values[String(sub.id)] = sub.selected;
      });
    });
    return values;
  }, [mergedData]);

  return {
    categories: mergedData,
    isLoading: isMethodologyLoading || isSelectionLoading,
    isError: isMethodologyError || isSelectionError,
    initialValues,
    methodologyName: methodology?.name,
  };
};
