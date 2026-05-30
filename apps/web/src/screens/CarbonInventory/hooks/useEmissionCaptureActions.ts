import { createContext, useContext } from "react";
import {
  EmissionCaptureFormLine,
  SubcategoryId,
  LineId,
} from "../types/EmissionCaptureTypes";

/**
 * Imperative actions that operate on the emission-capture form but are NOT part
 * of react-hook-form's `UseFormReturn` (adding/removing lines, scoped reset).
 *
 * These used to be spread onto `<FormProvider {...methods}>` and read back via
 * `useFormContext()`. react-hook-form 7.76 rewrote `FormProvider` to forward
 * only the known `UseFormReturn` members into context and drop every other prop,
 * so custom methods no longer survive that round-trip. They now travel through
 * this dedicated context instead.
 */
export interface EmissionCaptureActions {
  addLine: (subcategoryId: SubcategoryId) => EmissionCaptureFormLine;
  removeLine: (subcategoryId: SubcategoryId, lineId: LineId) => void;
  resetAfterSaveForSubcategory: (subcategoryId: SubcategoryId) => void;
}

export const EmissionCaptureActionsContext =
  createContext<EmissionCaptureActions | null>(null);

/**
 * Reads the emission-capture imperative actions from context. Must be called
 * within the `EmissionCaptureActionsContext` provider rendered by
 * `EmissionCaptureScreen`.
 */
export const useEmissionCaptureActions = (): EmissionCaptureActions => {
  const context = useContext(EmissionCaptureActionsContext);
  if (context === null) {
    throw new Error(
      "useEmissionCaptureActions must be used within an EmissionCaptureActionsContext provider"
    );
  }
  return context;
};
