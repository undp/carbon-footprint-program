import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ApproveReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const ApproveReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
