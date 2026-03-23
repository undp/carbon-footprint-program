import { z } from "zod";

export const DeleteReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const DeleteReductionProjectResponseSchema = z.object({}).strict();
