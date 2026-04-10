import { z } from "zod";
import { ReductionProjectBaseSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";
import { ReductionProjectMutationDataSchema } from "../schemas.js";

export const UpdateReductionProjectParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const UpdateReductionProjectRequestSchema =
  ReductionProjectMutationDataSchema.extend({
    fileUuids: z
      .array(z.uuid())
      .min(1, "At least one file is required")
      .describe("UUIDs of pre-uploaded files to attach to the new submission"),
  });

export const UpdateReductionProjectResponseSchema =
  ReductionProjectBaseSchema.omit({ status: true });
