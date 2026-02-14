import { z } from "zod";
import { IdSchema } from "../../../zod.js";

// Path parameters
export const RequestOrganizationAccreditationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to request accreditation for"),
});

// Response schema (empty object for success)
export const RequestOrganizationAccreditationResponseSchema = z.object({});
