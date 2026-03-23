import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const CopyReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const CopyReductionProjectResponseSchema = ReductionProjectSchema;
