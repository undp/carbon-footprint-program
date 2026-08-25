import {
  CUSTOM_FACTOR_SOURCES,
  EMISSION_FACTOR_DIMENSION_OTHER_VALUES,
} from "@/config/constants";
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
 * Comparable form of a catalog value. Same rule the dimensions maintainer uses
 * to reject duplicate variable names, so a hand-typed "  OTROS " is recognised
 * as the wording the maintainer already considers taken.
 */
const normalizeDimensionValue = (value: string): string =>
  value.trim().toLowerCase();

const OTHER_DIMENSION_VALUES = new Set(
  EMISSION_FACTOR_DIMENSION_OTHER_VALUES.map(normalizeDimensionValue)
);

/**
 * True when a dimension value is the "none of the listed options fits" escape
 * hatch, whichever wording the methodology maintainer gave it. The match is on
 * the whole value, so "Otro proceso" and "Otro país" — real catalog values with
 * their own emission factor — are not escape hatches.
 */
const isOtherDimensionValue = (value: string): boolean =>
  OTHER_DIMENSION_VALUES.has(normalizeDimensionValue(value));

/**
 * Keeps the "Otro" escape hatch at the bottom of a dimension dropdown. The API
 * returns dimension values alphabetically, which would otherwise bury it in the
 * middle of long catalogs (e.g. the mobile-combustion machinery list).
 */
export const sortDimensionValuesWithOtherLast = <T extends { value: string }>(
  values: T[]
): T[] =>
  values
    .filter((v) => !isOtherDimensionValue(v.value))
    .concat(values.filter((v) => isOtherDimensionValue(v.value)));
