import { z } from "zod";
import { IdSchema } from "../../../zod.js";

// Path parameters
export const BlockOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to block"),
});

// Response schema
export const BlockOrganizationResponseSchema = z.object({
  organizationId: IdSchema.describe("The blocked organization ID"),
});
