import { z } from "zod";
import { IdSchema } from "../../zod.js";
import {
  CreateReductionProjectBodySchema,
} from "../createReductionProject/schemas.js";
import { ReductionProjectSchema } from "../baseSchemas.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: IdSchema,
});

export const UpdateReductionProjectBodySchema =
  CreateReductionProjectBodySchema.omit({ organizationId: true }).partial();

export const UpdateReductionProjectResponseSchema = ReductionProjectSchema.omit(
  { files: true, reports: true }
);
