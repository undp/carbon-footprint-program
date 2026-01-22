import { EmissionFactor, RateMeasurementUnit } from "@repo/types";

export const CUSTOM_FACTOR_SOURCES = {
  OWN_FACTOR: "Factor Propio",
  OTHER: "Otro",
} as const;

const isCustomFactorSource = (factorSource: string | null): boolean => {
  if (!factorSource) return false;
  return (Object.values(CUSTOM_FACTOR_SOURCES) as string[]).includes(
    factorSource
  );
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

export const getBaseFactorId = (
  availableFactors: EmissionFactor[],
  factorSource: string | null
): string | null => {
  if (!factorSource || isCustomFactorSource(factorSource)) return null;

  const factor = availableFactors.find((ef) => ef.source === factorSource);
  if (!factor) return null;

  return factor.originalEmissionFactorId ?? factor.id;
};

export const getFactorData = (
  availableFactors: EmissionFactor[],
  factorSource: string | null
): {
  factorValue: number | null;
  factorRateMeasurementUnitId: string | null;
} => {
  if (!factorSource || isCustomFactorSource(factorSource)) {
    return { factorValue: null, factorRateMeasurementUnitId: null };
  }

  const factor = availableFactors.find((ef) => ef.source === factorSource);
  if (!factor) return { factorValue: null, factorRateMeasurementUnitId: null };

  const value = parseFloat(factor.value);
  return {
    factorValue: isNaN(value) ? null : value,
    factorRateMeasurementUnitId: factor.rateMeasurementUnitId,
  };
};
