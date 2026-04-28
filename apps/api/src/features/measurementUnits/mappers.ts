import type { MeasurementUnitStatus } from "@repo/database";
import type { GetAllMeasurementUnitsResponse } from "@repo/types";

type MeasurementUnitRow = {
  id: bigint | string;
  name: string;
  magnitude: string;
  abbreviation: string;
  baseFactor: number;
  isBase: boolean;
  status: MeasurementUnitStatus;
};

export const mapMeasurementUnitToResponse = (
  mu: MeasurementUnitRow,
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
