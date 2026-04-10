import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectMutationDataSchema } from "../schemas.js";

export const CreateReductionProjectRequestSchema =
  ReductionProjectMutationDataSchema;

export const CreateReductionProjectResponseSchema = z
  .object({
    id: IdSchema.describe("The new reduction project ID"),
  })
  .strict();
