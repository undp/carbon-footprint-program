import { z } from "zod";
import {
  EmissionFactorBaseSchema,
  SubcategoryBaseSchema,
  EmissionFactorDimensionValueBaseSchema,
  RateMeasurementUnitBaseSchema,
  EmissionFactorDimensionBaseSchema,
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
    subcategoryName: SubcategoryBaseSchema.shape.name,
    dimensionValue1Id:
      EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
    dimensionValue1Name:
      EmissionFactorDimensionBaseSchema.shape.name.nullable(),
    dimensionValue2Id:
      EmissionFactorDimensionValueBaseSchema.shape.id.nullable(),
    dimensionValue2Name:
      EmissionFactorDimensionBaseSchema.shape.name.nullable(),
    rateMeasurementUnitId: RateMeasurementUnitBaseSchema.shape.id,
    rateMeasurementUnitName: RateMeasurementUnitBaseSchema.shape.name,
    gasDetails: GasDetailsSchema,
  })
);
