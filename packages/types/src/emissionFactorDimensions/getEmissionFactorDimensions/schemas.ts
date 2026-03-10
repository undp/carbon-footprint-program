import { z } from "zod";
import {
  EmissionFactorDimensionBaseSchema,
  SubcategoryBaseSchema,
} from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

export const GetEmissionFactorDimensionsQuerySchema = z.strictObject({
  methodologyVersionId: IdSchema.describe(
    "The ID of the methodology version to filter dimensions by"
  ),
});

export const GetEmissionFactorDimensionsResponseSchema = z.array(
  z.object({
    subcategoryId: SubcategoryBaseSchema.shape.id,
    subcategoryName: z.string(),
    dimensions: z.array(
      EmissionFactorDimensionBaseSchema.pick({
        id: true,
        code: true,
        name: true,
        position: true,
        isRequired: true,
      })
    ),
  })
);
