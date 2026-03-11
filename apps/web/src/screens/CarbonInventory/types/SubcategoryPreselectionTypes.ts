import type { GetCarbonInventorySubcategoriesSummaryResponse } from "@repo/types";
import type { MethodologyCategory, MethodologySubcategory } from "./index";

type SubcategorySummaryItem =
  GetCarbonInventorySubcategoriesSummaryResponse[number];

type SubcategoryItem = Pick<
  MethodologySubcategory,
  "id" | "name" | "description" | "explanationId"
> &
  Pick<SubcategorySummaryItem, "included" | "edited">;

type CategoryWithSubcategories = Pick<
  MethodologyCategory,
  "id" | "name" | "description" | "synonyms" | "position" | "explanationId"
> & {
  subcategories: SubcategoryItem[];
};

export type SubcategoryPreselectionMergedData = CategoryWithSubcategories[];
