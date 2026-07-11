import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectWriteBodySchema } from "../schemas.js";

// Same body as update: a single save persists whatever the form filled (full or
// partial). No prerequisites/completeness at create — those gate at submit.
export const CreateReductionProjectRequestSchema =
  ReductionProjectWriteBodySchema;

export const CreateReductionProjectResponseSchema = z
  .object({
    id: IdSchema.describe("The new reduction project ID"),
  })
  .strict();
