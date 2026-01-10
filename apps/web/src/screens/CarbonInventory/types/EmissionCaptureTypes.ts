import type {
  MethodologyCategory,
  MethodologySubcategory,
  CarbonInventoryLine,
} from "./index";

type SubcategoryWithLines = MethodologySubcategory & {
  lines: CarbonInventoryLine[];
  isTotalManualEmissionsMode: boolean;
};

type CategoryWithSubcategoriesAndLines = MethodologyCategory & {
  subcategories: SubcategoryWithLines[];
};

export type EmissionCaptureMergedData = CategoryWithSubcategoriesAndLines[];
