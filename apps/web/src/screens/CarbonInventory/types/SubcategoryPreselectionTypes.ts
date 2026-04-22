import type { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";
import type { MethodologyCategory, MethodologySubcategory } from "./index";

type SubcategorySummaryItem =
  GetCarbonInventorySubcategoriesSummaryResponse[number];

type SubcategoryItem = Pick<
  MethodologySubcategory,
  "id" | "name" | "description" | "explanation"
> &
  Pick<SubcategorySummaryItem, "included" | "edited"> & {
    isRecommended: boolean;
  };

type CategoryWithSubcategories = Pick<
  MethodologyCategory,
  | "id"
  | "name"
  | "icon"
  | "color"
  | "description"
  | "synonyms"
  | "position"
  | "explanation"
> & {
  subcategories: SubcategoryItem[];
};

export type SubcategoryPreselectionMergedData = CategoryWithSubcategories[];
