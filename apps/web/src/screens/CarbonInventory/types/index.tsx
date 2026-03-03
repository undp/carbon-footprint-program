import type {
  GetAllMeasurementUnitsResponse,
  GetAllRateMeasurementUnitsResponse,
  GetCarbonInventoryByIdResponse,
  GetCarbonInventoryMethodologyResponse,
} from "@repo/types";

export type MethodologyCategory =
  GetCarbonInventoryMethodologyResponse["categories"][number];

export type MethodologySubcategory =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number];

export type MethodologyEmissionFactor =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number]["emissionFactors"][number];

export type MethodologyEmissionFactorDimension =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number]["dimensions"][number];

export type MeasurementUnit = GetAllMeasurementUnitsResponse[number];

export type RateMeasurementUnit = GetAllRateMeasurementUnitsResponse[number];

export type CarbonInventoryLine =
  GetCarbonInventoryByIdResponse["subcategories"][number]["lines"][number];

export type { SubcategoryPreselectionMergedData } from "./SubcategoryPreselectionTypes";

export type {
  EmissionCaptureMergedData,
  EmissionCaptureFormValues,
  SubcategoryId,
  LineId,
} from "./EmissionCaptureTypes";
