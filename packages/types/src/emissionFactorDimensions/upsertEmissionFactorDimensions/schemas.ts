import { z } from "zod";
import { SubcategoryBaseSchema } from "../../baseSchemas/index.js";

export const UpsertEmissionFactorDimensionsRequestSchema = z.array(
  z.strictObject({
    subcategoryId: SubcategoryBaseSchema.shape.id,
    dimensions: z.array(
      z.strictObject({
        code: z.string().min(1, "Código es requerido"),
        name: z.string().min(1, "Nombre es requerido"),
        position: z.number().int().min(1).max(2),
        isRequired: z.boolean(),
      })
    ),
  })
);

export const UpsertEmissionFactorDimensionsResponseSchema = z.object({
  updated: z.number().int(),
});
