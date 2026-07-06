import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectWriteBodySchema } from "../schemas.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

// Full-replace, identical body to create (see ReductionProjectWriteBodySchema).
export const UpdateReductionProjectRequestSchema =
  ReductionProjectWriteBodySchema;

export const UpdateReductionProjectResponseSchema = z
  .null()
  .describe("Reduction project updated successfully");
