import { z } from "zod";
import { IdSchema } from "../zod.js";

export const CountryBaseSchema = z.object({
  id: IdSchema.describe("The ID of the country"),
  name: z.string().describe("The name of the country"),
  isoCode: z.string().describe("The ISO code of the country"),
  createdAt: z.iso.datetime().describe("The creation date"),
  updatedAt: z.iso.datetime().nullable().describe("The update date"),
});
