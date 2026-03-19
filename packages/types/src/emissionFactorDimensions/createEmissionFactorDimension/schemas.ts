import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { EmissionFactorDimensionBaseSchema } from "../../baseSchemas/index.js";

export const CreateEmissionFactorDimensionRequestSchema = z.strictObject({
  subcategoryId: IdSchema.describe(
    "The ID of the subcategory this dimension belongs to"
  ),
  name: z
    .string()
    .trim()
    .min(1, "Nombre es requerido")
    .describe("The name of the dimension"),
  position: z
    .number()
    .int()
    .min(1)
    .max(2)
    .describe("The position of the dimension (1 or 2)"),
  isRequired: z
    .boolean()
    .describe("Whether this dimension is required for emission factors"),
  values: z
    .array(z.string().trim().min(1, "Variable es requerida"))
    .min(1, "Debe tener al menos una variable")
    .refine((vals) => new Set(vals).size === vals.length, {
      message: "Las variables no deben contener duplicados",
    })
    .describe("The initial values for this dimension"),
});

export const CreateEmissionFactorDimensionResponseSchema = z.object({
  id: EmissionFactorDimensionBaseSchema.shape.id,
  subcategoryId: IdSchema,
  code: z.string(),
  name: z.string(),
  position: z.number().int(),
  isRequired: z.boolean(),
  values: z.array(
    z.object({
      id: IdSchema,
      value: z.string(),
    })
  ),
});
