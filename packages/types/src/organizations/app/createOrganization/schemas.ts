import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../baseSchemas.js";

export const CreateOrganizationBodySchema = OrganizationMutationDataSchema;

export const CreateOrganizationResponseSchema = z.object({
  id: IdSchema.describe("The created organization ID"),
});
