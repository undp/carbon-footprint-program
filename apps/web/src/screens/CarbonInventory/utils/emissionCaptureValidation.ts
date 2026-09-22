import type {
  CategoryWithSubcategoriesAndLines,
  SubcategoryWithLines,
  EmissionCaptureFormValues,
  EmissionCaptureFormLine,
} from "../types/EmissionCaptureTypes";

/**
 * Whether the methodology came back with no emission factor at all.
 *
 * The factors offered to a footprint are filtered by its year, so a year the
 * catalogue does not cover yet — the current one, until its set is loaded —
 * produces a methodology whose every subcategory has an empty factor list.
 * Without saying so, capture shows an empty «Fuente» dropdown on every line
 * and reads as broken rather than as not-yet-available.
 *
 * It is one answer for the whole footprint, not a per-line collection: a
 * subcategory that legitimately has no factor for a dimension combination is
 * ordinary, the catalogue being absent is not.
 */
export function hasNoCatalogueFactors(
  categories: CategoryWithSubcategoriesAndLines[]
): boolean {
  return categories.every((category) =>
    category.subcategories.every(
      (subcategory) => subcategory.emissionFactors.length === 0
    )
  );
}

/**
 * Which notice capture owes the user when no «Fuente» dropdown has anything to
 * offer. `null` when the screen has nothing to explain.
 *
 * The two cases look identical on screen and have opposite ways out, so they
 * are told apart here rather than merged:
 *  - `YEAR_NOT_LOADED` — the footprint has a year and the catalogue does not
 *    cover it yet. Capture still works: a manual factor is what the
 *    methodology asks for when no published factor applies.
 *  - `NO_YEAR` — the footprint never got a year. `carbon_inventory.year` is
 *    nullable and no route guard enforces the order of the steps, so capture
 *    can be opened by URL before step 1 has saved one, and
 *    `buildEmissionFactorWhere` offers nothing at all to a footprint with no
 *    year. Nothing on this screen fixes it; the year does.
 *
 * A methodology with no categories says nothing either way — there is no
 * dropdown to be empty — so it earns no notice.
 */
export type EmptyCatalogueNotice = "YEAR_NOT_LOADED" | "NO_YEAR";

export function resolveEmptyCatalogueNotice(
  year: number | null | undefined,
  categories: CategoryWithSubcategoriesAndLines[] | undefined
): EmptyCatalogueNotice | null {
  if (!categories || categories.length === 0) return null;
  if (!hasNoCatalogueFactors(categories)) return null;

  return year == null ? "NO_YEAR" : "YEAR_NOT_LOADED";
}

export function shouldShowSubcategory(
  subcategory: SubcategoryWithLines,
  formSubcategory:
    EmissionCaptureFormValues["subcategories"][string] | undefined
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
