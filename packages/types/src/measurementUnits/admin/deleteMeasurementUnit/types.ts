import type { z } from "zod";
import type {
  DeleteMeasurementUnitParamsSchema,
  DeleteMeasurementUnitResponseSchema,
} from "./schemas.js";

export type DeleteMeasurementUnitParams = z.infer<
  typeof DeleteMeasurementUnitParamsSchema
>;
export type DeleteMeasurementUnitResponse = z.infer<
  typeof DeleteMeasurementUnitResponseSchema
>;
