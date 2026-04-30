import { z } from "zod";
import { MeasurementUnitMutationSchema } from "../schemas.js";
import { IdSchema } from "../../../zod.js";
import { MeasurementUnitBaseSchema } from "../../../baseSchemas/measurementUnit.js";

export const UpdateMeasurementUnitParamsSchema = z.object({
  id: IdSchema,
});

export const UpdateMeasurementUnitBodySchema =
  MeasurementUnitMutationSchema.partial();

export const UpdateMeasurementUnitResponseSchema = MeasurementUnitBaseSchema;
