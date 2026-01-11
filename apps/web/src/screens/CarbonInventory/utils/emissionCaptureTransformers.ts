import {
  CarbonInventoryLine,
  UpdateCarbonInventoryLineRequestItem,
} from "@repo/types";

/**
 * Transforms form lines to the API request format
 * Converts CarbonInventoryLine to UpdateCarbonInventoryLineRequestItem
 */
export function mapLinesToRequest(
  lines: CarbonInventoryLine[]
): UpdateCarbonInventoryLineRequestItem[] {
  return lines.map((line) => {
    // Determine baseFactorId based on factorSource
    // If factorSource is "Factor Propio", baseFactorId should be null
    // TODO: Store baseFactorId in the line when a factor is selected from emissionFactors
    const baseFactorId = line.factorSource === "Factor Propio" ? null : null;

    return {
      id: line.id,
      dimensionValue1Id: line.dimensionValue1Id,
      dimensionValue2Id: line.dimensionValue2Id,
      measurementUnitId: line.measurementUnitId,
      quantity: Number(line.quantity),
      factorSource: line.factorSource,
      baseFactorId,
      appliedFactorValue: Number(line.factorValue),
      appliedFactorRateMeasurementUnitId: line.factorRateMeasurementUnitId,
      manualTotalEmissions: null,
      comment: line.comment,
    };
  });
}
