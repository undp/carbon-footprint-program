import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const DeleteReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const DeleteReductionProjectResponseSchema = z.object({}).strict();
