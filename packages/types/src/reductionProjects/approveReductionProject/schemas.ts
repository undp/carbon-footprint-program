import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const ApproveReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const ApproveReductionProjectResponseSchema =
  ReductionProjectSchema.omit({ files: true, reports: true });
