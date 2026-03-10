import { z } from "zod";
import {
  EmissionFactorBaseSchema,
  SubcategoryBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
  RateMeasurementUnitBaseSchema,
} from "../../baseSchemas/index.js";
import { GasDetailsSchema } from "../../baseSchemas/gasDetails.js";
import { IdSchema } from "../../zod.js";

export const GetAllEmissionFactorsQuerySchema = z.strictObject({
  methodologyVersionId: IdSchema.describe(
    "The ID of the methodology version to filter emission factors by"
  ),
});

export const GetAllEmissionFactorsResponseSchema = z.array(
  EmissionFactorBaseSchema.pick({
    id: true,
    value: true,
    source: true,
  }).extend({
    subcategoryId: SubcategoryBaseSchema.shape.id,
    subcategoryName: z.string(),
    dimensionValue1Id:
      EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
    dimensionValue1Name: z.string().nullable(),
    dimensionValue2Id:
      EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
    dimensionValue2Name: z.string().nullable(),
    rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
    rateMeasurementUnitName: z.string(),
    gasDetails: GasDetailsSchema,
  })
);
