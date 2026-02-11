import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { CreateOrganizationBodySchema } from "../createOrganization/schemas.js";

export const UpdateOrganizationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

export const UpdateOrganizationRequestSchema =
  CreateOrganizationBodySchema.partial();

export const UpdateOrganizationResponseSchema = z.object({});
