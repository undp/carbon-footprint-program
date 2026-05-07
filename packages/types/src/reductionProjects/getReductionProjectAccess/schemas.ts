import { z } from "zod";
import { OrganizationRole } from "@repo/database/enums";
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
    membership: z
      .object({
        role: z.enum(OrganizationRole),
      })
      .strict()
      .nullable()
      .describe(
        "Active membership the requesting user holds in the project's organization, or null if user has no membership"
      ),
  })
  .strict();
