import { z } from "zod";
import { IdSchema } from "../zod.js";

export const CountryOrganizationSizeBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country organization size"),
  countryId: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the organization size"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
});
