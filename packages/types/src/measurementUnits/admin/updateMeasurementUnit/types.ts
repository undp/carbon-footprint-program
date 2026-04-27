import type { z } from "zod";
import type {
  UpdateMeasurementUnitParamsSchema,
  UpdateMeasurementUnitBodySchema,
  UpdateMeasurementUnitResponseSchema,
} from "./schemas.js";

export type UpdateMeasurementUnitParams = z.infer<
  typeof UpdateMeasurementUnitParamsSchema
>;
export type UpdateMeasurementUnitBody = z.infer<
  typeof UpdateMeasurementUnitBodySchema
>;
export type UpdateMeasurementUnitResponse = z.infer<
  typeof UpdateMeasurementUnitResponseSchema
>;
