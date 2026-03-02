import { z } from "zod";
import { IdSchema } from "../../zod.js";
import { CountrySubsectorBaseSchema } from "../../baseSchemas/index.js";

const SectorItemSchema = z.object({
  id: IdSchema.describe("The ID of the sector"),
  name: z.string().min(1).describe("The name of the sector"),
  subsectors: z
    .array(CountrySubsectorBaseSchema.pick({ id: true, name: true }))
    .describe("The subsectors of the sector"),
});

export const GetAllCountrySectorsResponseSchema = z.array(SectorItemSchema);
