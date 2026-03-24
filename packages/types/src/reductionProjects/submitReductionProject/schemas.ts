import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const SubmitReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const SubmitReductionProjectResponseSchema = ReductionProjectSchema;
