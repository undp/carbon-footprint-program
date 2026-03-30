import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  SubcategoryBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
  RateMeasurementUnitBaseSchema,
  EmissionFactorBaseSchema,
  EmissionFactorDimensionBaseSchema,
} from "../../baseSchemas/index.js";
import { GasDetailsSchema } from "../../baseSchemas/gasDetails.js";

export const UpdateEmissionFactorParamsSchema = z
  .object({
    id: IdSchema.describe("The ID of the emission factor to update"),
  })
  .strict();

export const UpdateEmissionFactorRequestSchema = z
  .object({
    subcategoryId: SubcategoryBaseSchema.shape.id,
    dimensionValue1Name:
      EmissionFactorDimensionBaseSchema.shape.name.nullable(),
    dimensionValue2Name:
      EmissionFactorDimensionBaseSchema.shape.name.nullable(),
    rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
    source: z.string().min(1),
    gasDetails: GasDetailsSchema,
    value: z.number(),
  })
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "At least one field must be provided with a defined value",
  });

export const UpdateEmissionFactorResponseSchema = EmissionFactorBaseSchema.pick(
  {
    id: true,
    value: true,
    source: true,
  }
).extend({
  subcategoryId: SubcategoryBaseSchema.shape.id,
  subcategoryName: SubcategoryBaseSchema.shape.name,
  dimensionValue1Id: EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
  dimensionValue1Name: EmissionFactorDimensionBaseSchema.shape.name.nullable(),
  dimensionValue2Id: EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
  dimensionValue2Name: EmissionFactorDimensionBaseSchema.shape.name.nullable(),
  rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
  rateMeasurementUnitName: RateMeasurementUnitBaseSchema.shape.name,
  gasDetails: GasDetailsSchema,
});
