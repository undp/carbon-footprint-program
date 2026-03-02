import {
  GetAllRateMeasurementUnitsResponse,
  GetCarbonInventoryMethodologyResponse,
} from "@repo/types";
import { CUSTOM_FACTOR_SOURCES } from "@/config/constants";

type EmissionFactors =
  GetCarbonInventoryMethodologyResponse["categories"][number]["subcategories"][number]["emissionFactors"];

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
  rateMeasurementUnits: GetAllRateMeasurementUnitsResponse
): string | null => {
  if (!measurementUnitId) return null;
  return (
    rateMeasurementUnits.find(
      (rmu) => rmu.denominatorUnit.id === measurementUnitId
    )?.id ?? null
  );
};

export const getAvailableFactors = (
  emissionFactors: EmissionFactors,
  dimensionValue1Id: string | null,
  dimensionValue2Id: string | null,
  rateMeasurementUnitId: string | null
): EmissionFactors => {
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
  availableFactors: EmissionFactors
): string[] => {
  return [...new Set(availableFactors.map((f) => f.source))];
};
