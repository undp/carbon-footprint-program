import { z } from "zod";
import type { GetAllCountryOrganizationSizesResponseSchema } from "./schemas.js";

export type GetAllCountryOrganizationSizesResponse = z.infer<
  typeof GetAllCountryOrganizationSizesResponseSchema
>;
