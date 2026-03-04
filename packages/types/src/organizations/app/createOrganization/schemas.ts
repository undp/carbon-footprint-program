import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationMutationDataSchema } from "../../schemas.js";

export const CreateOrganizationBodySchema = OrganizationMutationDataSchema;

export const CreateOrganizationResponseSchema = z.object({
  id: IdSchema.describe("The created organization ID"),
});
