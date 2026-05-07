import { z } from "zod";
import { OrganizationRole } from "@repo/database/enums";
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
    membership: z
      .object({
        role: z.enum(OrganizationRole),
      })
      .strict()
      .nullable()
      .describe(
        "Active membership the requesting user holds in the inventory's organization, or null if standalone inventory or user has no membership"
      ),
  })
  .strict();
