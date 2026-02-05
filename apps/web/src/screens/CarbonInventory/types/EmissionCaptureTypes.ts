import { GetCarbonInventoryByIdResponse } from "@repo/types";
import type {
  MethodologyCategory,
  MethodologySubcategory,
  CarbonInventorySubcategory,
  CarbonInventoryLine,
} from "./index";

export type EmissionCaptureFormLine = CarbonInventoryLine & {
  baseFactorId: string | null;
  lineId: string;
  /**
   * Marks this line as newly created on the client.
   * New lines have temporary IDs (prefixed with "temp-") and need to be created on submit.
   */
  isNew?: boolean;
  /**
   * Marks this line as deleted on the client.
   * Deleted lines are hidden from the UI but tracked for deletion on submit.
   */
  isDeleted?: boolean;
};

export interface LineValidationState {
  canSelectFactorSource: boolean;
  canEditFactorValue: boolean;
  factorSourceDisabledReason: string | null;
  factorValueDisabledReason: string | null;
}

export type SubcategoryWithLines = MethodologySubcategory & {
  lines: EmissionCaptureFormLine[];
  isTotalManualEmissionsModeAvailable: CarbonInventorySubcategory["isTotalManualEmissionsModeAvailable"];
  isTotalManualEmissionsModeActive: CarbonInventorySubcategory["isTotalManualEmissionsModeActive"];
};

type CategoryWithSubcategoriesAndLines = MethodologyCategory & {
  subcategories: SubcategoryWithLines[];
};

export type EmissionCaptureMergedData = {
  name: GetCarbonInventoryByIdResponse["name"];
  year: GetCarbonInventoryByIdResponse["year"];
  usageMode: GetCarbonInventoryByIdResponse["usageMode"];
  categories: CategoryWithSubcategoriesAndLines[];
} | null;

/**
 * Type alias for subcategory IDs to prevent ID mix-ups.
 * Maps to the actual subcategory ID field.
 */
export type SubcategoryId = CarbonInventorySubcategory["id"];

/**
 * Type alias for line IDs to prevent ID mix-ups.
 * Maps to the actual line ID field.
 */
export type LineId = EmissionCaptureFormLine["id"];

export type EmissionCaptureFormValues = {
  subcategories: Record<
    SubcategoryId,
    {
      categoryId: CategoryWithSubcategoriesAndLines["id"];
      isTotalManualEmissionsModeAvailable: CarbonInventorySubcategory["isTotalManualEmissionsModeAvailable"];
      isTotalManualEmissionsModeActive: CarbonInventorySubcategory["isTotalManualEmissionsModeActive"];
      lines: Record<LineId, EmissionCaptureFormLine>;
    }
  >;
};
