import { z } from "zod";
import { IdSchema } from "../zod.js";

export const CountryJobPositionBaseSchema = z.object({
  id: IdSchema.describe("The unique identifier for the country job position."),
  countryId: IdSchema.describe("The ID of the associated country."),
  name: z.string().describe("The name of the country job position."),
  createdAt: z.iso
    .datetime()
    .describe("The date and time when the country job position was created."),
  updatedAt: z.iso
    .datetime()
    .nullable()
    .describe(
      "The date and time when the country job position was last updated."
    ),
});
