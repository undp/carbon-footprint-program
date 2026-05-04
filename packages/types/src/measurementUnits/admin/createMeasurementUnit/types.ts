import type { z } from "zod";
import type {
  CreateMeasurementUnitBodySchema,
  CreateMeasurementUnitResponseSchema,
} from "./schemas.js";

export type CreateMeasurementUnitBody = z.infer<
  typeof CreateMeasurementUnitBodySchema
>;
export type CreateMeasurementUnitResponse = z.infer<
  typeof CreateMeasurementUnitResponseSchema
>;
