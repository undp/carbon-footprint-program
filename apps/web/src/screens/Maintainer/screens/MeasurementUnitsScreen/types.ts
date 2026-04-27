import type { GetAllMeasurementUnitsResponse } from "@repo/types";

export type MeasurementUnitForm = Omit<
  GetAllMeasurementUnitsResponse[number],
  "status"
>;
