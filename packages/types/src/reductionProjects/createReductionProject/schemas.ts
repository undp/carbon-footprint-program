import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const CreateReductionProjectRequestSchema = z
  .object({})
  .strict()
  .describe("Creates an empty reduction project row");

export const CreateReductionProjectResponseSchema = z
  .object({
    id: IdSchema.describe("The new reduction project ID"),
  })
  .strict();
