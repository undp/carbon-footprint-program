import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ReopenReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const ReopenReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
