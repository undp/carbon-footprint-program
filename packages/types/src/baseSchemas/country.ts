import { z } from "zod";

export const CountryBaseSchema = z.object({
  id: z.bigint().describe("The ID of the country"),
  name: z.string().describe("The name of the country"),
  isoCode: z.string().describe("The ISO code of the country"),
  createdAt: z.date().describe("The creation date"),
  updatedAt: z.date().nullable().describe("The update date"),
});
