import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../schemas.js";

// Path parameters
export const UpdateOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to update"),
});

// Body schema
export const UpdateOrganizationBodySchema = OrganizationMutationDataSchema;

// Response schema (empty object for success)
export const UpdateOrganizationResponseSchema = z.object({});
