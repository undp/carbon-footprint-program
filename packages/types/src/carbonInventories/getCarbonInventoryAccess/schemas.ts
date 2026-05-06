import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const GetCarbonInventoryAccessParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
});

export const GetCarbonInventoryAccessResponseSchema = z
  .object({
    canEdit: z
      .boolean()
      .describe(
        "Whether the requesting user is allowed to edit this inventory (combines edit-role and editable-status checks)"
      ),
  })
  .strict();
