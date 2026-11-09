import type {
  DuplicateEmissionFactorYearChange,
  EmissionFactorYearCopyViolationReason,
  GetAllEmissionFactorsResponse,
} from "@repo/types";
import { YearCopyOutcome, type YearCopyPlan } from "@repo/utils";
import {
  APP_LOCALE,
  EMISSION_FACTOR_COPY_WARNING_PERCENT,
  EMISSION_FACTOR_COPY_WARNING_RATIO,
} from "@/config/constants";
import { formatter } from "@/utils/formatting";
import type { YearCopyEdits } from "../hooks/useYearCopyEdits";

/**
 * How a copied value moved from its source value, as the copy page shows it
 * next to the source value. A ratio at or beyond
 * `EMISSION_FACTOR_COPY_WARNING_RATIO` reads as a likely unit error (×1000,
 * ÷1000); anything else is a percentage, a warning beyond
 * `EMISSION_FACTOR_COPY_WARNING_PERCENT`. Warnings inform, never block.
 */
export type CopyValueVariation =
  | { kind: "percent"; percent: number; isWarning: boolean }
  | { kind: "ratio"; ratio: number; direction: "up" | "down"; isWarning: true }
  | { kind: "fromZero"; isWarning: true };

export const getCopyValueWarning = (
  sourceValue: number,
  targetValue: number | null
): CopyValueVariation | null => {
  if (targetValue === null || targetValue === sourceValue) return null;
  if (sourceValue === 0) return { kind: "fromZero", isWarning: true };

  const ratio = Math.abs(targetValue / sourceValue);
  const sameSign = Math.sign(targetValue) === Math.sign(sourceValue);
  if (sameSign && ratio >= EMISSION_FACTOR_COPY_WARNING_RATIO) {
    return { kind: "ratio", ratio, direction: "up", isWarning: true };
  }
  if (
    sameSign &&
    ratio > 0 &&
    ratio <= 1 / EMISSION_FACTOR_COPY_WARNING_RATIO
  ) {
    return {
      kind: "ratio",
      ratio: 1 / ratio,
      direction: "down",
      isWarning: true,
    };
  }

  const percent = ((targetValue - sourceValue) / Math.abs(sourceValue)) * 100;
  return {
    kind: "percent",
    percent,
    isWarning: Math.abs(percent) > EMISSION_FACTOR_COPY_WARNING_PERCENT,
  };
};

// At most four significant digits on the chip; the tooltip has the full number.
const chipNumber = new Intl.NumberFormat(APP_LOCALE, {
  maximumSignificantDigits: 4,
  useGrouping: false,
});

/** The chip text: «+17 %», «−3,5 %», «×1000», «÷1000», «nuevo». */
export const formatCopyValueVariation = (
  variation: CopyValueVariation
): string => {
  switch (variation.kind) {
    case "fromZero":
      return "desde 0";
    case "ratio":
      return `${variation.direction === "up" ? "×" : "÷"}${chipNumber.format(variation.ratio)}`;
    case "percent": {
      const sign = variation.percent > 0 ? "+" : "−";
      return `${sign}${chipNumber.format(Math.abs(variation.percent))} %`;
    }
  }
};

/**
 * The years a copy starts with: the latest year with factors as the source and
 * the next one as the target. When the next one is outside the window, the
 * newest window year other than the source.
 */
export const getDefaultCopyYears = (
  sourceYears: readonly number[],
  windowYears: readonly number[]
): { sourceYear: number; targetYear: number } | null => {
  if (sourceYears.length === 0) return null;
  const sourceYear = Math.max(...sourceYears);
  const targetYear = getDefaultTargetYear(sourceYear, windowYears);
  return targetYear === null ? null : { sourceYear, targetYear };
};

/** The target a source year starts with; see `getDefaultCopyYears`. */
export const getDefaultTargetYear = (
  sourceYear: number,
  windowYears: readonly number[]
): number | null => {
  if (windowYears.includes(sourceYear + 1)) return sourceYear + 1;
  return windowYears.find((year) => year !== sourceYear) ?? null;
};

/** The sentence behind a variation chip, with the whole number. */
export const describeCopyValueVariation = (
  variation: CopyValueVariation,
  sourceYear: number,
  targetYear: number
): string => {
  switch (variation.kind) {
    case "fromZero":
      return `El valor ${sourceYear} es 0 y el de ${targetYear} no. Revisa el valor.`;
    case "ratio":
      return variation.direction === "up"
        ? `El valor ${targetYear} es ${formatter.exact(variation.ratio)} veces el de ${sourceYear}. Revisa la unidad.`
        : `El valor ${targetYear} es ${formatter.exact(variation.ratio)} veces menor que el de ${sourceYear}. Revisa la unidad.`;
    case "percent": {
      const sign = variation.percent > 0 ? "+" : "−";
      return `El valor ${targetYear} cambia ${sign}${formatter.exact(Math.abs(variation.percent))} % respecto al de ${sourceYear}.`;
    }
  }
};

export type YearCopyListedFactor = GetAllEmissionFactorsResponse[number];

/** One row of the copy page's grid: a source-year factor and its copy. */
export interface YearCopyRow {
  id: string;
  subcategoryId: string;
  subcategoryName: string;
  dimensionValue1Name: string | null;
  dimensionValue2Name: string | null;
  rateUnitName: string;
  storedSource: string;
  storedValue: number;
  outcome: YearCopyOutcome;
  /** The target-year factors already on the row (`EXISTS_IN_TARGET`). */
  targetFactors: ReadonlyArray<{ id: string; source: string; value: number }>;
  /** What the source cell shows while editing: the typed text or the stored source. */
  sourceInput: string;
  /** The source the copy gets, normalized; `""` when blank. */
  targetSource: string;
  /** The value the copy gets; `null` while emptied. */
  targetValue: number | null;
  sourceChanged: boolean;
  valueChanged: boolean;
  reasons: readonly EmissionFactorYearCopyViolationReason[];
  variation: CopyValueVariation | null;
  /** A gas breakdown summing above zero: the value changes in the maintainer. */
  gasLocked: boolean;
}

const sumsAboveZero = (gasDetails: Record<string, number>): boolean =>
  Object.values(gasDetails).reduce((sum, amount) => sum + amount, 0) > 0;

export const buildYearCopyRows = (
  plan: YearCopyPlan<YearCopyListedFactor>,
  edits: YearCopyEdits,
  reasonsById: ReadonlyMap<
    string,
    readonly EmissionFactorYearCopyViolationReason[]
  >
): YearCopyRow[] =>
  plan.rows.map(({ sourceFactor, outcome, targetFactors, result }) => {
    const storedValue = Number(sourceFactor.value);
    const isCopied = outcome === YearCopyOutcome.COPY;
    return {
      id: sourceFactor.id,
      subcategoryId: sourceFactor.subcategoryId,
      subcategoryName: sourceFactor.subcategoryName,
      dimensionValue1Name: sourceFactor.dimensionValue1Name,
      dimensionValue2Name: sourceFactor.dimensionValue2Name,
      rateUnitName: sourceFactor.rateMeasurementUnitName,
      storedSource: sourceFactor.source,
      storedValue,
      outcome,
      targetFactors: targetFactors.map((factor) => ({
        id: factor.id,
        source: factor.source,
        value: Number(factor.value),
      })),
      sourceInput: edits[sourceFactor.id]?.source ?? sourceFactor.source,
      targetSource: result.source,
      targetValue: result.value,
      sourceChanged: isCopied && result.sourceChanged,
      valueChanged: isCopied && result.valueChanged,
      reasons: reasonsById.get(sourceFactor.id) ?? [],
      variation: isCopied
        ? getCopyValueWarning(storedValue, result.value)
        : null,
      gasLocked: sumsAboveZero(sourceFactor.gasDetails),
    };
  });

/**
 * The request's changes: an excluded factor sends only `exclude`, a copied one
 * only what differs, and a factor already in the target year sends nothing.
 */
export const toYearCopyRequestChanges = (
  plan: YearCopyPlan<YearCopyListedFactor>,
  edits: YearCopyEdits
): DuplicateEmissionFactorYearChange[] =>
  plan.rows.flatMap(({ sourceFactorId, outcome, result }) => {
    const edit = edits[sourceFactorId];
    if (!edit) return [];
    if (outcome === YearCopyOutcome.EXCLUDED) {
      return [{ sourceFactorId, exclude: true as const }];
    }
    if (outcome !== YearCopyOutcome.COPY) return [];
    const change: DuplicateEmissionFactorYearChange = { sourceFactorId };
    if (edit.value !== undefined && edit.value !== null) {
      change.value = edit.value;
    }
    if (edit.source !== undefined) change.source = result.source;
    return change.value === undefined && change.source === undefined
      ? []
      : [change];
  });
