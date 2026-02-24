import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../../baseSchemas.js";

export const UpdateOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to update"),
});

export const UpdateOrganizationBodySchema = OrganizationMutationDataSchema;

export const UpdateOrganizationResponseSchema = z.object({
  id: IdSchema.describe("The updated organization ID"),
});
