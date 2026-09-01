/**
 * Year-mismatch state for saved catalog factors.
 *
 * A line's `appliedFactorYear` is a historical snapshot: it records the vintage
 * that was applied when the line was saved and is never rewritten, not when the
 * catalog is edited and not when the footprint year changes. So whether a line
 * disagrees with the current footprint year is *derived*, here, at render time.
 * Storing it as a flag would go stale the moment someone re-dated the inventory.
 *
 * Everything in this file is pure, so the warning recomputes from the current
 * line snapshots on every render — after a reload, after a single factor edit,
 * and after an inventory-year change — without anything having to invalidate it.
 */

/** The only fields the rule needs. Keeps the helpers usable from any read model. */
export type FactorYearLine = {
  /** Null for a custom factor and for a direct total: neither is a catalog row. */
  emissionFactorId: string | null;
  /** Null for a transversal catalog factor, which applies to every year. */
  appliedFactorYear: number | null;
  /** False for a line the user removed in the editor but has not saved yet. */
  isDeleted?: boolean;
};

/**
 * True when a line takes part in the rule at all.
 *
 * Deliberately excluded, each for its own reason:
 *  - a custom or manual factor has no catalog vintage to compare;
 *  - a direct total has no factor at all;
 *  - an incomplete line has not chosen one yet;
 *  - a transversal catalog factor is valid for every year by definition;
 *  - a deleted line is on its way out.
 */
export const isDatedCatalogLine = (
  line: FactorYearLine,
  inventoryYear: number | null
): boolean =>
  !line.isDeleted &&
  inventoryYear !== null &&
  line.emissionFactorId !== null &&
  line.appliedFactorYear !== null;

/** True when a participating line's applied vintage is not the footprint year. */
export const isFactorYearMismatch = (
  line: FactorYearLine,
  inventoryYear: number | null
): boolean =>
  isDatedCatalogLine(line, inventoryYear) &&
  line.appliedFactorYear !== inventoryYear;

export type FactorYearMismatchSummary = {
  /** Participating lines whose vintage differs from the footprint year. */
  affectedCount: number;
  /** All participating lines, so the count reads as "3 de 8" rather than "3". */
  eligibleCount: number;
  /** Distinct mismatching vintages, ascending. */
  mismatchedYears: number[];
  inventoryYear: number;
} | null;

/**
 * Summarizes one subcategory's dated-catalog lines, or returns null when there
 * is nothing to report — no footprint year, no participating lines, or every
 * participating line already matches.
 */
export const summarizeFactorYearMismatches = (
  lines: FactorYearLine[],
  inventoryYear: number | null
): FactorYearMismatchSummary => {
  if (inventoryYear === null) return null;

  const eligible = lines.filter((line) =>
    isDatedCatalogLine(line, inventoryYear)
  );
  const affected = eligible.filter(
    (line) => line.appliedFactorYear !== inventoryYear
  );

  if (affected.length === 0) return null;

  const mismatchedYears = [
    ...new Set(affected.map((line) => line.appliedFactorYear as number)),
  ].sort((a, b) => a - b);

  return {
    affectedCount: affected.length,
    eligibleCount: eligible.length,
    mismatchedYears,
    inventoryYear,
  };
};

const formatYearList = (years: number[]): string => {
  if (years.length === 1) return String(years[0]);
  const head = years.slice(0, -1).join(", ");
  return `${head} y ${years[years.length - 1]}`;
};

/**
 * The subcategory warning text. States the counts, the vintages and the footprint
 * year, and says outright that nothing was recalculated — the point of the
 * warning is to make a stale choice visible, not to imply the platform changed a
 * number behind the organization's back.
 */
export const buildFactorYearMismatchMessage = (
  summary: NonNullable<FactorYearMismatchSummary>
): string => {
  const lineWord = summary.eligibleCount === 1 ? "línea" : "líneas";

  return `${summary.affectedCount} de ${summary.eligibleCount} ${lineWord} con factor de catálogo fechado usan factores de ${formatYearList(summary.mismatchedYears)}, distintos del año ${summary.inventoryYear} de la huella. Los cálculos no fueron modificados; revisa las fuentes si corresponde.`;
};
