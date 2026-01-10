import type {
  GetCarbonInventoryByIdResponse,
  GetCarbonInventoryMethodologyResponse,
} from "@repo/types";

export type MethodologyCategory =
  GetCarbonInventoryMethodologyResponse["categories"][number];
export type MethodologySubcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

export type CarbonInventoryLine =
  GetCarbonInventoryByIdResponse["subcategories"][number]["lines"][number];

export type { SubcategoryPreselectionMergedData } from "./SubcategoryPreselectionTypes";
export type { EmissionCaptureMergedData } from "./EmissionCaptureTypes";
