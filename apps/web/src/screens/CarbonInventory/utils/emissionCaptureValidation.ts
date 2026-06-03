import type {
  CategoryWithSubcategoriesAndLines,
  SubcategoryWithLines,
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
} from "../types/EmissionCaptureTypes";

export function shouldShowSubcategory(
  subcategory: SubcategoryWithLines,
  formSubcategory:
    | EmissionCaptureFormValues["subcategories"][string]
    | undefined
): boolean {
  if (
    subcategory.lines.length === 0 &&
    !subcategory.isTotalManualEmissionsModeActive
  )
    return false;

  const allLinesDeleted = Object.values(formSubcategory?.lines ?? {}).every(
    (l) => l.isDeleted
  );
  if (formSubcategory?.isTotalManualEmissionsModeActive && allLinesDeleted)
    return false;

  return true;
}

/**
 * A detailed (non-manual) line is "complete" only when its emission can actually
 * be computed. The emission is `quantity × factorValue` (see
 * `useEmissionSubcategoryTotal` / `EmissionEditorEmissionsCell`), so a line that
 * is missing either input contributes nothing to the inventory and must be
 * flagged as incomplete — e.g. a row where the user entered a quantity but never
 * picked a factor, or an empty row left behind after "Agregar Fuente".
 */
function canComputeLineEmission(line: EmissionCaptureFormLine): boolean {
  return line.quantity != null && line.factorValue != null;
}

/**
 * Checks whether every visible subcategory across all categories is complete,
 * i.e. all of its emissions can be computed.
 *
 * A subcategory is considered "filled" when:
 * - It is not visible (no lines and not in manual mode), OR
 * - All form lines are deleted (user explicitly removed every source), OR
 * - It is in manual-total mode AND a total has actually been entered, OR
 * - It is in detailed mode, has at least one source, and every non-deleted line
 *   can have its emission computed (quantity + factor).
 *
 * It warns on partially-filled subcategories: a manual mode with an empty total,
 * and detailed lines that are started but not computable.
 */
export function areAllSubcategoriesFilled(
  categories: CategoryWithSubcategoriesAndLines[],
  formValues: EmissionCaptureFormValues
): boolean {
  return categories.every((category) =>
    category.subcategories.every((subcategory) => {
      const formSub = formValues.subcategories?.[subcategory.id];
      if (!shouldShowSubcategory(subcategory, formSub)) return true;
      if (!formSub) return true;

      // Only consider real lines: skip id-less partial objects that RHF
      // reconciliation can leave behind (a dirty cell path rebuilt onto a record
      // whose line id no longer exists). They are not real sources and would
      // otherwise be counted as incomplete and trigger a false warning.
      const lines = Object.values(formSub.lines ?? {}).filter(
        (line) => line && line.lineId
      );
      const activeLines = lines.filter((line) => !line.isDeleted);

      // Manual total mode: complete only when a total has actually been entered.
      if (formSub.isTotalManualEmissionsModeActive) {
        return activeLines[0]?.manualTotalEmissions != null;
      }

      // Filled if every line has been deleted — user opted out of all sources.
      if (lines.length > 0 && activeLines.length === 0) return true;

      // Detailed mode: there must be at least one source, and every non-deleted
      // line must be computable — so half-filled or empty rows raise the warning.
      return (
        activeLines.length > 0 && activeLines.every(canComputeLineEmission)
      );
    })
  );
}
