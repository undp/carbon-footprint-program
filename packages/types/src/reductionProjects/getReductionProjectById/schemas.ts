import { z } from "zod";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const GetReductionProjectByIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const GetReductionProjectByIdResponseSchema = ReductionProjectSchema;
