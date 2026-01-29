import { EmissionFactor, RateMeasurementUnit } from "@repo/types";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";

const isCustomFactorSource = (factorSource: string | null): boolean => {
  if (!factorSource) return false;
  return CUSTOM_FACTOR_SOURCES.includes(factorSource);
};

export const isFactorValueEditable = (factorSource: string | null): boolean => {
  return isCustomFactorSource(factorSource);
};

export const getCompatibleRateUnitId = (
  measurementUnitId: string | null,
  rateMeasurementUnits: RateMeasurementUnit[]
): string | null => {
  if (!measurementUnitId) return null;
  return (
    rateMeasurementUnits.find(
      (rmu) => rmu.denominatorUnit.id === measurementUnitId
    )?.id ?? null
  );
};

export const getAvailableFactors = (
  emissionFactors: EmissionFactor[],
  dimensionValue1Id: string | null,
  dimensionValue2Id: string | null,
  rateMeasurementUnitId: string | null
): EmissionFactor[] => {
  if (!rateMeasurementUnitId) return [];

  return emissionFactors.filter(
    (ef) =>
      (ef.dimensionValue1Id === null ||
        ef.dimensionValue1Id === dimensionValue1Id) &&
      ef.dimensionValue2Id === dimensionValue2Id &&
      ef.rateMeasurementUnitId === rateMeasurementUnitId
  );
};

export const getAvailableSources = (
  availableFactors: EmissionFactor[]
): string[] => {
  return [...new Set(availableFactors.map((f) => f.source))];
};
