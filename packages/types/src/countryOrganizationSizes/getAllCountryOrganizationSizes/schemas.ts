import { z } from "zod";
import { CountryOrganizationSizeBaseSchema } from "../../baseSchemas/index.js";

export const GetAllCountryOrganizationSizesResponseSchema = z.array(
  CountryOrganizationSizeBaseSchema.pick({
    id: true,
    name: true,
  })
);
