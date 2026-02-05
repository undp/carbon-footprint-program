import { z } from "zod";
import { IdSchema } from "../../zod.js";

const CountrySubsectorSchema = z.object({
  id: IdSchema.describe("The ID of the subsector"),
  name: z.string().min(1).describe("The name of the subsector"),
});

export const CountrySectorSchema = z.object({
  id: IdSchema.describe("The ID of the sector"),
  name: z.string().min(1).describe("The name of the sector"),
  subsectors: z.array(CountrySubsectorSchema),
});

export const GetAllCountrySectorsResponseSchema = z.array(CountrySectorSchema);
