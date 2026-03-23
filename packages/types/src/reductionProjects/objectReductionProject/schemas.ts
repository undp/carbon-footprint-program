import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ObjectReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const ObjectReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
