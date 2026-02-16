import { z } from "zod";
import { IdSchema } from "../zod.js";

export const EntityReferenceSchema = z.object({
  id: IdSchema.describe("The entity ID"),
  name: z.string().describe("The entity name"),
});

export const OrganizationDisplayStatusSchema = z.enum([
  "ACCREDITED",
  "NOT_ACCREDITED",
  "BLOCKED",
]);

export const OrganizationDisplayStatusValues =
  OrganizationDisplayStatusSchema.enum;
