import { z } from "zod";
import { IdSchema } from "../zod.js";

export const CountryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the country"),
  isoCode: z.string().describe("The ISO code of the country"),
  createdAt: z.date().describe("The creation date"),
  updatedAt: z.date().nullable().describe("The update date"),
});
