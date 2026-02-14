import { z } from "zod";
import { IdSchema } from "../../../zod.js";

// Path parameters
export const BlockOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to block"),
});

// Response schema (empty object for success)
export const BlockOrganizationResponseSchema = z.object({});
