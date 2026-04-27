import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { MeasurementUnitStatusSchema } from "../../../baseSchemas/measurementUnit.js";

export const DeleteMeasurementUnitParamsSchema = z.object({
  id: IdSchema,
});

export const DeleteMeasurementUnitResponseSchema = z.object({
  id: IdSchema,
  status: MeasurementUnitStatusSchema,
});
