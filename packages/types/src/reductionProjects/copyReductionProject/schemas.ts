import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const CopyReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const CopyReductionProjectResponseSchema = ReductionProjectSchema;
