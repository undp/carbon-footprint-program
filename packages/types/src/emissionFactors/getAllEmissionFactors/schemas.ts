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
    year: true,
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
    // How many active lines depend on this factor. A factor is immutable while
    // any of them does, and the API enforces that; this is what lets the
    // maintainer stop offering an edit that would be refused, and say by how
    // many lines. It is as fresh as the last read — the 409 is the authority.
    referencedLineCount: z
      .number()
      .int()
      .min(0)
      .describe(
        "How many active carbon inventory lines reference this emission factor"
      ),
  })
);
