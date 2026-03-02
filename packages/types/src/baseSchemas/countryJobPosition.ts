import { z } from "zod";
import { IdSchema } from "../zod.js";

export const CountryJobPositionBaseSchema = z.object({
  id: IdSchema,
  countryId: IdSchema,
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
});
