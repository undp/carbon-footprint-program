import type {
  CategoryWithSubcategoriesAndLines,
  SubcategoryWithLines,
  EmissionCaptureFormValues,
} from "../types/EmissionCaptureTypes";

/**
 * Checks whether every visible subcategory across all categories
 * has at least some emission data filled in.
 *
 * A subcategory is considered "filled" when:
 * - It is not visible (no lines and not in manual mode), OR
 * - It is in manual-total mode with all lines deleted (hidden), OR
 * - It is in manual-total mode (active), OR
 * - At least one non-deleted line has a positive quantity.
 */
export function areAllSubcategoriesFilled(
  categories: CategoryWithSubcategoriesAndLines[],
  formValues: EmissionCaptureFormValues
): boolean {
  return categories.every((category) =>
    (category.subcategories as SubcategoryWithLines[]).every((subcategory) => {
      const formSub = formValues.subcategories?.[subcategory.id];
      // Not visible: no lines and not in manual mode
      if (
        subcategory.lines.length === 0 &&
        !subcategory.isTotalManualEmissionsModeActive
      )
        return true;
      // Not visible: manual mode with all lines deleted
      if (formSub?.isTotalManualEmissionsModeActive) {
        const allDeleted = Object.values(formSub.lines ?? {}).every(
          (l) => l.isDeleted
        );
        if (allDeleted) return true;
      }
      if (!formSub) return true;
      // Filled if manual total mode is active
      if (formSub.isTotalManualEmissionsModeActive) return true;
      // Filled if at least one non-deleted line has a non-null quantity
      return Object.values(formSub.lines ?? {}).some(
        (line) => !line.isDeleted && line.quantity != null && line.quantity > 0
      );
    })
  );
}
