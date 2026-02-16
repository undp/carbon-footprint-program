import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const RequestOrganizationAccreditationParamsSchema = z.object({
  id: IdSchema.describe("The organization ID to request accreditation for"),
});

export const RequestOrganizationAccreditationResponseSchema = z.object({});
