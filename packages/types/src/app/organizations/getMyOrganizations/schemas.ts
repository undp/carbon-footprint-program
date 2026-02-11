import { z } from "zod";
import { IdSchema } from "../../../zod.js";

export const GetMyOrganizationsResponseItemSchema = z.object({
  id: IdSchema.describe("Organization ID"),
  name: z
    .string()
    .describe("Organization name (trade_name, legal_name, or tax_id fallback)"),
});

export const GetMyOrganizationsResponseSchema = z.array(
  GetMyOrganizationsResponseItemSchema
);
