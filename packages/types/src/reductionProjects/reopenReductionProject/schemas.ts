import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ReopenReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const ReopenReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
