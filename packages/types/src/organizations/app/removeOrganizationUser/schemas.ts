import { z } from "zod";
import { IdSchema } from "../../../zod.js";

// Path parameters
export const RemoveOrganizationUserParamsSchema = z.object({
  organizationId: IdSchema.describe("The organization ID"),
  userId: IdSchema.describe("The user ID to remove"),
});

// Response schema
export const RemoveOrganizationUserResponseSchema = z.object({});
