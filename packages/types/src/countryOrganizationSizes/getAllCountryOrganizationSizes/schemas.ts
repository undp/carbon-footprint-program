import { z } from "zod";
import { CountryOrganizationSizeBaseSchema } from "../../baseSchemas/index.js";
import { IdSchema } from "../../zod.js";

export const GetAllCountryOrganizationSizesResponseSchema = z.array(
  z.object({
    id: IdSchema,
    name: CountryOrganizationSizeBaseSchema.shape.name,
  })
);
