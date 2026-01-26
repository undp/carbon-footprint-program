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
  isTotalManualEmissionsMode: CarbonInventorySubcategory["isTotalManualEmissionsMode"];
};

type CategoryWithSubcategoriesAndLines = MethodologyCategory & {
  subcategories: SubcategoryWithLines[];
};

export type EmissionCaptureMergedData = {
  year: GetCarbonInventoryByIdResponse["year"];
  usageMode: GetCarbonInventoryByIdResponse["usageMode"];
  categories: CategoryWithSubcategoriesAndLines[];
} | null;

export type EmissionCaptureFormValues = {
  subcategories: Record<
    string,
    {
      isTotalManualEmissionsMode: CarbonInventorySubcategory["isTotalManualEmissionsMode"];
      lines: Record<string, EmissionCaptureFormLine>;
    }
  >;
};
