import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetReductionProjectAccessParamsSchema = z.object({
  id: IdSchema.describe("The reduction project ID"),
});

export const GetReductionProjectAccessResponseSchema = z
  .object({
    canEdit: z
      .boolean()
      .describe(
        "Whether the requesting user is allowed to edit this project (combines edit-role and editable-status checks)"
      ),
  })
  .strict();
