import { GetCarbonInventoryByIdResponse } from "@repo/types";
import type {
  MethodologyCategory,
  MethodologySubcategory,
  CarbonInventorySubcategory,
  CarbonInventoryLine,
} from "./index";

/**
 * Derived from the canonical API response so the form line stays in sync
 * with the server contract.
 */
export type LineFileSummary =
  GetCarbonInventoryByIdResponse["subcategories"][number]["lines"][number]["files"][number] & {
    /**
     * Client-only marker for files uploaded inside the dialog but not yet
     * linked to the line on the server. Cleared after a successful sync.
     */
    isPending?: boolean;
  };

/**
 * The factor fields exactly as the server last returned them, captured when the
 * line is loaded and never written to afterwards.
 *
 * Comparing the live fields against this is what lets a save say "I did not
 * touch the factor" instead of restating one. That distinction matters for
 * lines saved before the factor carried its catalog id: restating those loses
 * the snapshot, while declaring them unchanged keeps it.
 */
export type LoadedFactorSnapshot = Pick<
  CarbonInventoryLine,
  | "emissionFactorId"
  | "factorSource"
  | "factorValue"
  | "factorRateMeasurementUnitId"
>;

export type EmissionCaptureFormLine = Omit<CarbonInventoryLine, "files"> & {
  baseFactorId: string | null;
  /** Null for a line created in this session: it has nothing stored yet. */
  loadedFactor: LoadedFactorSnapshot | null;
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
  /**
   * Files attached to this line. Includes both server-linked files and
   * pending uploads (`isPending: true`). Replaces server-linked files only
   * after a successful sync.
   */
  files: LineFileSummary[];
  /**
   * IDs of currently-linked files the user has marked for deletion. Sent
   * to the API on the next sync to unlink + soft-delete in one transaction.
   */
  removedFileIds: string[];
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

export type CategoryWithSubcategoriesAndLines = Omit<
  MethodologyCategory,
  "subcategories"
> & {
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
