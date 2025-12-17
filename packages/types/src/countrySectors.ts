import { z } from "zod";

const CountrySubsectorSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the subsector"),
  name: z.string().min(1).describe("The name of the subsector"),
});

export const CountrySectorSchema = z.object({
  id: z.string().regex(/^\d+$/).describe("The ID of the sector"),
  name: z.string().min(1).describe("The name of the sector"),
  subsectors: z.array(CountrySubsectorSchema),
});

export const GetAllCountrySectorsResponseSchema = z.array(CountrySectorSchema);

export type CountrySector = z.infer<typeof CountrySectorSchema>;
export type CountrySubsector = z.infer<typeof CountrySubsectorSchema>;
export type GetAllCountrySectorsResponse = z.infer<
  typeof GetAllCountrySectorsResponseSchema
>;
