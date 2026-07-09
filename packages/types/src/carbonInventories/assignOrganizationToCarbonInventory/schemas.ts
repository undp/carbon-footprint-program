import { z } from "zod";
import { IdSchema } from "../../zod.js";

export const AssignOrganizationToCarbonInventoryParamsSchema = z.object({
  id: IdSchema.describe("The carbon inventory ID"),
  organizationId: IdSchema.describe(
    "The organization to associate with the carbon inventory"
  ),
});

export const AssignOrganizationToCarbonInventoryResponseSchema = z
  .null()
  .describe("Organization associated successfully");
