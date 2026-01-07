import type {
  GetCarbonInventoryMethodologyResponse,
  GetCarbonInventorySubcategoriesSummaryResponse,
} from "@repo/types";

// Tipos base extraídos de las respuestas del API
type MethodologySubcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];
type MethodologyCategory =
  GetCarbonInventoryMethodologyResponse["categories"][number];
type SubcategorySummaryItem =
  GetCarbonInventorySubcategoriesSummaryResponse[number];

export type SubcategoryItem = Pick<
  MethodologySubcategory,
  "id" | "name" | "description"
> &
  Pick<SubcategorySummaryItem, "included" | "edited">;

export type SubcategoryWithMethodology = Pick<
  MethodologySubcategory,
  "id" | "name" | "description" | "examples" | "dimensions" | "emissionFactors"
> &
  Pick<SubcategorySummaryItem, "included" | "edited">;

export type CategoryWithSubcategories = Pick<
  MethodologyCategory,
  "id" | "name" | "description" | "synonyms" | "position"
> & {
  subcategories: SubcategoryItem[];
};

export type SubcategoryPreselectionMergedData = CategoryWithSubcategories[];
