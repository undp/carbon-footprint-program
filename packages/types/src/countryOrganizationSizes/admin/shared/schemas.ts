import { z } from "zod";
import { CountryOrganizationSizeBaseSchema } from "../../../baseSchemas/index.js";

export const AdminCountryOrganizationSizeSchema =
  CountryOrganizationSizeBaseSchema.extend({
    isInUse: z
      .boolean()
      .describe(
        "Whether the row is referenced by user data (organization profiling)"
      ),
  });

export type AdminCountryOrganizationSize = z.infer<
  typeof AdminCountryOrganizationSizeSchema
>;
