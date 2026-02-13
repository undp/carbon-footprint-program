import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { OrganizationDetailsSchema } from "../schemas.js";

// Path parameters
export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

// Response schema
export const GetOrganizationByIdResponseSchema = OrganizationDetailsSchema;
