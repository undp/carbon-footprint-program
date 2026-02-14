import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../baseSchemas.js";

// Body schema
export const CreateOrganizationBodySchema = OrganizationMutationDataSchema;

// Response schema
export const CreateOrganizationResponseSchema = z.object({
  id: IdSchema.describe("The created organization ID"),
});
