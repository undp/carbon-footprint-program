import { UpdateCarbonInventoryLineRequestItem } from "@repo/types";
import { EmissionCaptureFormLine } from "../types/EmissionCaptureTypes";

export function mapLinesToRequest(
  lines: EmissionCaptureFormLine[]
): UpdateCarbonInventoryLineRequestItem[] {
  return lines.map((line) => {
    return {
      id: line.lineId,
      dimensionValue1Id: line.dimensionValue1Id,
      dimensionValue2Id: line.dimensionValue2Id,
      measurementUnitId: line.measurementUnitId,
      quantity: line.quantity ? Number(line.quantity) : null,
      factorSource: line.factorSource,
      baseFactorId: line.baseFactorId ?? null,
      appliedFactorValue: line.factorValue ? Number(line.factorValue) : null,
      appliedFactorRateMeasurementUnitId: line.factorRateMeasurementUnitId,
      manualTotalEmissions: null,
      comment: line.comment,
    };
  });
}
