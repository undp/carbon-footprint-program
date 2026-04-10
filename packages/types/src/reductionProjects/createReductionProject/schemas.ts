import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { ReductionProjectMutationDataSchema } from "../schemas.js";

export const CreateReductionProjectRequestSchema =
  ReductionProjectMutationDataSchema.extend({
    fileUuids: z
      .array(z.uuid())
      .min(1, "At least one file is required")
      .describe("UUIDs of pre-uploaded files to attach to the submission"),
  });

export const CreateReductionProjectResponseSchema = z
  .object({
    id: IdSchema.describe("The new reduction project ID"),
  })
  .strict();
