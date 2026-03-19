import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CreateEmissionFactorDimensionResponseSchema } from "../createEmissionFactorDimension/schemas.js";

export const UpdateEmissionFactorDimensionParamsSchema = z.strictObject({
  id: IdSchema.describe("The ID of the dimension to update"),
});

export const UpdateEmissionFactorDimensionRequestSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nombre es requerido")
      .optional()
      .describe("Updated name for the dimension"),
    isRequired: z
      .boolean()
      .optional()
      .describe("Updated required flag for the dimension"),
    values: z
      .object({
        add: z
          .array(z.string().trim().min(1, "Variable es requerida"))
          .optional()
          .describe("New values to add to the dimension"),
        remove: z
          .array(IdSchema)
          .optional()
          .describe("IDs of values to remove from the dimension"),
      })
      .optional()
      .describe("Value changes to apply"),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.isRequired !== undefined ||
      v.values !== undefined,
    { message: "At least one field must be provided" }
  );

export const UpdateEmissionFactorDimensionResponseSchema =
  CreateEmissionFactorDimensionResponseSchema;
