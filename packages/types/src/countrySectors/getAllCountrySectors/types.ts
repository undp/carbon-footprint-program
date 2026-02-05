import { z } from "zod";
import type {
  CountrySectorSchema,
  GetAllCountrySectorsResponseSchema,
} from "./schemas.ts";

export type CountrySector = z.infer<typeof CountrySectorSchema>;

export type CountrySubsector = z.infer<typeof CountrySectorSchema>;

export type GetAllCountrySectorsResponse = z.infer<
  typeof GetAllCountrySectorsResponseSchema
>;
