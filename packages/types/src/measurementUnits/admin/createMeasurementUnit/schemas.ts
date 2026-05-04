import {
  MeasurementUnitMutationSchema,
  MeasurementUnitCreationResultSchema,
} from "../schemas.js";
import { MeasurementUnitBaseSchema } from "../../../baseSchemas/measurementUnit.js";

export const CreateMeasurementUnitBodySchema = MeasurementUnitMutationSchema;

export const CreateMeasurementUnitResponseSchema =
  MeasurementUnitBaseSchema.extend({
    action: MeasurementUnitCreationResultSchema,
  });
