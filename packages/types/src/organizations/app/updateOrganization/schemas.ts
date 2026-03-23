import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../../schemas.js";

export const UpdateOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to update"),
});

export const UpdateOrganizationBodySchema =
  OrganizationMutationDataSchema.extend({
    fileUuids: z.array(z.uuid()).optional(),
  });

export const UpdateOrganizationResponseSchema = z.object({
  id: IdSchema.describe("The updated organization ID"),
});
