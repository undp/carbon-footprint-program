import type {
  MethodologyCategory,
  MethodologySubcategory,
  CarbonInventoryLine,
} from "./index";

export type SubcategoryWithLines = MethodologySubcategory & {
  lines: CarbonInventoryLine[];
  isTotalManualEmissionsMode: boolean;
};

type CategoryWithSubcategoriesAndLines = MethodologyCategory & {
  subcategories: SubcategoryWithLines[];
};

export type EmissionCaptureMergedData = CategoryWithSubcategoriesAndLines[];

export type EmissionCaptureFormValues = {
  subcategories: Record<
    string,
    {
      lines: CarbonInventoryLine[];
    }
  >;
};
