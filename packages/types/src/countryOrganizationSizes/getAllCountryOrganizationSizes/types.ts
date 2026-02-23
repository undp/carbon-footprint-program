import { z } from "zod";
import type {
  CountryOrganizationSizeSchema,
  GetAllCountryOrganizationSizesResponseSchema,
} from "./schemas.js";

export type CountryOrganizationSize = z.infer<
  typeof CountryOrganizationSizeSchema
>;
export type GetAllCountryOrganizationSizesResponse = z.infer<
  typeof GetAllCountryOrganizationSizesResponseSchema
>;
