import { z } from "zod";

export const CountryOrganizationSizeBaseSchema = z.object({
  id: z.bigint().describe("The ID of the country organization size"),
  countryId: z.bigint().describe("The ID of the country"),
  name: z.string().describe("The name of the organization size"),
  createdAt: z.date().describe("The creation date"),
  updatedAt: z.date().nullable().describe("The update date"),
});
