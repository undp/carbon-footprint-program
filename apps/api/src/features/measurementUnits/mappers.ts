import type { Magnitude, MeasurementUnit } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

type MeasurementUnitWithMagnitude = MeasurementUnit & {
  magnitude: Magnitude;
};

export const mapMeasurementUnitToResponse = (
  mu: MeasurementUnitWithMagnitude,
  referenceCount: number
): GetAllMeasurementUnitsResponse[number] => ({
  id: mu.id.toString(),
  name: mu.name,
  magnitudeId: mu.magnitudeId.toString(),
  abbreviation: mu.abbreviation,
  baseFactor: mu.baseFactor,
  isBase: mu.isBase,
  status: mu.status,
  referenceCount,
  magnitude: {
    id: mu.magnitude.id.toString(),
    code: mu.magnitude.code,
    name: mu.magnitude.name,
    isSystem: mu.magnitude.isSystem,
    status: mu.magnitude.status,
  },
});
