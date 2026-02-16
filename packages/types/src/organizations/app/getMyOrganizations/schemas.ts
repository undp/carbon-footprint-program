import { z } from "zod";
import { IdSchema } from "../../../zod.js";

const OrganizationListItemSchema = z.object({
  id: IdSchema.describe("The organization ID"),
  name: z.string().describe("The organization name"),
});

export const GetMyOrganizationsResponseSchema = z.array(
  OrganizationListItemSchema
);
