import { z } from "zod";
import { IdSchema } from "../../../zod.js";
import { CompleteOrganizationInfoSchema } from "../../schemas.js";

// Path parameters
export const GetOrganizationByIdParamsSchema = z.object({
  id: IdSchema.describe("The organization ID"),
});

// Response schema: full organization details (for GET endpoints)
export const GetOrganizationByIdResponseSchema = CompleteOrganizationInfoSchema;
