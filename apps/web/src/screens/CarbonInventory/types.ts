import type {
  GetCarbonInventoryMethodologyResponse,
  GetCarbonInventorySubcategoriesSummaryResponse,
} from "@repo/types";

// Renamed api response types for clarity
type MethodologyCategory =
  GetCarbonInventoryMethodologyResponse["categories"][number];
type MethodologySubcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

type SubcategorySummaryItem =
  GetCarbonInventorySubcategoriesSummaryResponse[number];

type SubcategoryItem = Pick<
  MethodologySubcategory,
  "id" | "name" | "description"
> &
  Pick<SubcategorySummaryItem, "included" | "edited">;

type CategoryWithSubcategories = Pick<
  MethodologyCategory,
  "id" | "name" | "description" | "synonyms" | "position"
> & {
  subcategories: SubcategoryItem[];
};

export type SubcategoryPreselectionMergedData = CategoryWithSubcategories[];
