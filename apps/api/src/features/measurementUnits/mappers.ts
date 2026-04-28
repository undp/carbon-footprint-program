import type { MeasurementUnit } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

export const mapMeasurementUnitToResponse = (
  mu: MeasurementUnit,
  referenceCount: number
): GetAllMeasurementUnitsResponse[number] => ({
  id: mu.id.toString(),
  name: mu.name,
  magnitude:
    mu.magnitude as GetAllMeasurementUnitsResponse[number]["magnitude"],
  abbreviation: mu.abbreviation,
  baseFactor: mu.baseFactor,
  isBase: mu.isBase,
  status: mu.status,
  referenceCount,
});
