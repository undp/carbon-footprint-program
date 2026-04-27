import { z } from "zod";
import { CountryOrganizationSizeStatus } from "@repo/database/enums";
import { IdSchema } from "../zod.js";

export const CountryOrganizationSizeBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country organization size"),
  countryId: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the organization size"),
  description: z
    .string()
    .nullable()
    .describe("Optional description of the organization size"),
  status: z
    .enum(CountryOrganizationSizeStatus)
    .describe("Lifecycle status of the organization size"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
  createdById: IdSchema.nullable().describe(
    "The ID of the user who created this size"
  ),
  updatedById: IdSchema.nullable().describe(
    "The ID of the user who last updated this size"
  ),
});
