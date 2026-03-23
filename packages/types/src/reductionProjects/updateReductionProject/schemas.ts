import { z } from "zod";
import {
  CreateReductionProjectBodySchema,
} from "../createReductionProject/schemas.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the reduction project"),
});

export const UpdateReductionProjectBodySchema =
  CreateReductionProjectBodySchema.omit({ organizationId: true }).partial();

export const UpdateReductionProjectResponseSchema = ReductionProjectSchema.omit(
  { files: true, reports: true }
);
