import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectMutationDataSchema } from "../schemas.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const UpdateReductionProjectRequestSchema =
  ReductionProjectMutationDataSchema;

export const UpdateReductionProjectResponseSchema = z.object({});
