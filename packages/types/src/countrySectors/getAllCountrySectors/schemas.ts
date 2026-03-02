import { z } from "zod";
import {
  CountrySectorBaseSchema,
  CountrySubsectorBaseSchema,
} from "../../baseSchemas/index.js";

const SectorItemSchema = CountrySectorBaseSchema.pick({
  id: true,
  name: true,
}).extend({
  subsectors: z
    .array(CountrySubsectorBaseSchema.pick({ id: true, name: true }))
    .describe("The subsectors of the sector"),
});

export const GetAllCountrySectorsResponseSchema = z.array(SectorItemSchema);
