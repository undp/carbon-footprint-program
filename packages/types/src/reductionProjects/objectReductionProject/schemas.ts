import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ObjectReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const ObjectReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
