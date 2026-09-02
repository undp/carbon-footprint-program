import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";
import { isOtherDimensionValue } from "@/utils/emissionFactorDimensions";
import { MethodologyEmissionFactor, RateMeasurementUnit } from "../../../types";

const isCustomFactorSource = (
  factorSource: string | null | undefined
): boolean => {
  if (!factorSource) return false;
  return CUSTOM_FACTOR_SOURCES.includes(factorSource);
};

export const isFactorValueEditable = (
  factorSource: string | null | undefined
): boolean => {
  return isCustomFactorSource(factorSource);
};

export const getCompatibleRateUnitId = (
  measurementUnitId: string | null,
  rateMeasurementUnits: RateMeasurementUnit[] | undefined
): string | null => {
  if (!measurementUnitId) return null;
  return (
    rateMeasurementUnits?.find(
      (rmu) => rmu.denominatorUnit.id === measurementUnitId
    )?.id ?? null
  );
};

export const getAvailableFactors = (
  emissionFactors: MethodologyEmissionFactor[],
  dimensionValue1Id: string | null,
  dimensionValue2Id: string | null,
  rateMeasurementUnitId: string | null
): MethodologyEmissionFactor[] => {
  if (!rateMeasurementUnitId) return [];

  return emissionFactors.filter(
    (ef) =>
      (ef.dimensionValue1Id === null ||
        ef.dimensionValue1Id === dimensionValue1Id) &&
      (ef.dimensionValue2Id === null ||
        ef.dimensionValue2Id === dimensionValue2Id) &&
      ef.rateMeasurementUnitId === rateMeasurementUnitId
  );
};

export const getAvailableSources = (
  availableFactors: MethodologyEmissionFactor[]
): string[] => {
  return [...new Set(availableFactors.map((f) => f.source))];
};

/**
 * Keeps every value in EMISSION_FACTOR_DIMENSION_OTHER_VALUES at the bottom of
 * a dimension dropdown. The API returns dimension values alphabetically, which
 * would otherwise bury the escape hatch in the middle of long catalogs (e.g.
 * the mobile-combustion machinery list). Several of them keep their relative
 * order among themselves.
 */
export const sortDimensionValuesWithOtherLast = <T extends { value: string }>(
  values: T[]
): T[] =>
  values
    .filter((v) => !isOtherDimensionValue(v.value))
    .concat(values.filter((v) => isOtherDimensionValue(v.value)));

/**
 * A catalog factor is identified by `(source, year)`, so its option text has to
 * carry both. `year = null` means the factor is transversal — applicable to every
 * reporting year — and reads as the bare provider name: writing "(Transversal)"
 * would put a label where the data already speaks for itself.
 */
export const buildFactorOptionLabel = (factor: {
  source: string;
  year: number | null;
}): string =>
  factor.year === null ? factor.source : `${factor.source} (${factor.year})`;

/**
 * Deduplicates candidates down to one entry per canonical catalog factor.
 *
 * The methodology payload expands every factor into each unit of its family, so
 * the same catalog row can appear more than once. The ranking counts canonical
 * factors, not representations, or a factor with many compatible units would
 * look like a tie with itself.
 */
const toCanonicalFactors = (
  factors: MethodologyEmissionFactor[]
): MethodologyEmissionFactor[] => {
  const byBaseId = new Map<string, MethodologyEmissionFactor>();
  for (const factor of factors) {
    if (!byBaseId.has(factor.baseEmissionFactorId)) {
      byBaseId.set(factor.baseEmissionFactorId, factor);
    }
  }
  return [...byBaseId.values()];
};

/** Which rule picked the winning candidates. Exported for tests and messaging. */
export const FactorYearRank = {
  EXACT_YEAR: "EXACT_YEAR",
  TRANSVERSAL: "TRANSVERSAL",
  NEAREST_EARLIER: "NEAREST_EARLIER",
  NEAREST_LATER: "NEAREST_LATER",
} as const;

export type FactorYearRank =
  (typeof FactorYearRank)[keyof typeof FactorYearRank];

export type RankedFactors = {
  rank: FactorYearRank;
  candidates: MethodologyEmissionFactor[];
};

/**
 * Ranks compatible catalog factors against the footprint year and returns the
 * first non-empty rank, in the order: exact year, transversal, nearest earlier
 * year, nearest later year.
 *
 * Earlier beats later deliberately: a factor published before the footprint year
 * describes conditions closer to it than one published after.
 *
 * Returns `null` when nothing is compatible. When the inventory has no year —
 * reachable only through a bypassed flow — no dated factor can be ranked at all,
 * so only transversal candidates come back.
 */
export const rankCatalogFactorsByYear = (
  factors: MethodologyEmissionFactor[],
  inventoryYear: number | null
): RankedFactors | null => {
  const canonical = toCanonicalFactors(factors);
  if (canonical.length === 0) return null;

  const transversal = canonical.filter((factor) => factor.year === null);
  const dated = canonical.filter(
    (factor): factor is MethodologyEmissionFactor & { year: number } =>
      factor.year !== null
  );

  if (inventoryYear === null) {
    return transversal.length > 0
      ? { rank: FactorYearRank.TRANSVERSAL, candidates: transversal }
      : null;
  }

  const exact = dated.filter((factor) => factor.year === inventoryYear);
  if (exact.length > 0) {
    return { rank: FactorYearRank.EXACT_YEAR, candidates: exact };
  }

  if (transversal.length > 0) {
    return { rank: FactorYearRank.TRANSVERSAL, candidates: transversal };
  }

  const earlier = dated.filter((factor) => factor.year < inventoryYear);
  if (earlier.length > 0) {
    const nearestYear = Math.max(...earlier.map((factor) => factor.year));
    return {
      rank: FactorYearRank.NEAREST_EARLIER,
      candidates: earlier.filter((factor) => factor.year === nearestYear),
    };
  }

  const later = dated.filter((factor) => factor.year > inventoryYear);
  if (later.length > 0) {
    const nearestYear = Math.min(...later.map((factor) => factor.year));
    return {
      rank: FactorYearRank.NEAREST_LATER,
      candidates: later.filter((factor) => factor.year === nearestYear),
    };
  }

  return null;
};

export type FactorRecommendation = {
  /** Set only when the winning rank holds exactly one canonical factor. */
  recommended: MethodologyEmissionFactor | null;
  /** Every factor at the winning rank, so a tie can be presented in full. */
  candidates: MethodologyEmissionFactor[];
  rank: FactorYearRank | null;
};

/**
 * Recommends a catalog factor for the footprint year, or declines to.
 *
 * A recommendation is returned only when the winning rank holds exactly one
 * canonical factor. Two providers publishing for the same year are two
 * legitimate scientific choices, and picking between them is the organization's
 * call — so array order, source text and factor ID are never used as tie-breakers.
 * The tied candidates come back so the UI can present them.
 */
export const recommendCatalogFactor = (
  emissionFactors: MethodologyEmissionFactor[],
  dimensionValue1Id: string | null,
  dimensionValue2Id: string | null,
  rateMeasurementUnitId: string | null,
  inventoryYear: number | null
): FactorRecommendation => {
  const compatible = getAvailableFactors(
    emissionFactors,
    dimensionValue1Id,
    dimensionValue2Id,
    rateMeasurementUnitId
  );

  const ranked = rankCatalogFactorsByYear(compatible, inventoryYear);
  if (ranked === null) {
    return { recommended: null, candidates: [], rank: null };
  }

  return {
    recommended: ranked.candidates.length === 1 ? ranked.candidates[0] : null,
    candidates: ranked.candidates,
    rank: ranked.rank,
  };
};

/**
 * The catalog options for a line's `Factor` selector, one per canonical factor,
 * sorted the way a reader scans them: newest year first, then transversal, then
 * by provider name. Sorting is presentation only — it never decides which factor
 * is recommended.
 */
export const getCatalogFactorOptions = (
  emissionFactors: MethodologyEmissionFactor[],
  dimensionValue1Id: string | null,
  dimensionValue2Id: string | null,
  rateMeasurementUnitId: string | null
): { id: string; label: string }[] =>
  toCanonicalFactors(
    getAvailableFactors(
      emissionFactors,
      dimensionValue1Id,
      dimensionValue2Id,
      rateMeasurementUnitId
    )
  )
    .sort((a, b) => {
      if (a.year !== b.year) {
        if (a.year === null) return 1;
        if (b.year === null) return -1;
        return b.year - a.year;
      }
      return a.source.localeCompare(b.source);
    })
    .map((factor) => ({
      id: factor.baseEmissionFactorId,
      label: buildFactorOptionLabel(factor),
    }));
