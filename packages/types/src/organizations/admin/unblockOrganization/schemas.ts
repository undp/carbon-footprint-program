import { z } from "zod";
import { IdSchema } from "../../../zod.js";

// Path parameters
export const UnblockOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to unblock"),
});

// Response schema
export const UnblockOrganizationResponseSchema = z.object({
  organizationId: IdSchema.describe("The unblocked organization ID"),
});
