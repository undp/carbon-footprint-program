import { z } from "zod";
import { CreateMeasurementUnitBodySchema } from "../createMeasurementUnit/schemas.js";
import { IdSchema } from "../../../zod.js";
import { MeasurementUnitBaseSchema } from "../../../baseSchemas/measurementUnit.js";

export const UpdateMeasurementUnitParamsSchema = z.object({
  id: IdSchema,
});

export const UpdateMeasurementUnitBodySchema =
  CreateMeasurementUnitBodySchema.partial();

export const UpdateMeasurementUnitResponseSchema = MeasurementUnitBaseSchema;
