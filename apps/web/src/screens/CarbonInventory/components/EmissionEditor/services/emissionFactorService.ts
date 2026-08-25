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
