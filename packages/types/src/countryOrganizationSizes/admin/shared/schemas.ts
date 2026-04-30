import { z } from "zod";
import { CountryOrganizationSizeBaseSchema } from "../../../baseSchemas/index.js";

export const AdminCountryOrganizationSizeSchema =
  CountryOrganizationSizeBaseSchema.extend({
    position: z
      .number()
      .int()
      .positive()
      .describe(
        "Order position used to render the size in admin lists. Greater than 0; unique per country among non-deleted rows."
      ),
    isInUse: z
      .boolean()
      .describe(
        "Whether the row is referenced by user data (organization profiling)"
      ),
    impactedChildren: z
      .object({
        organizationData: z.number().int().nonnegative(),
      })
      .describe(
        "Counts of external references that would be impacted if this organization size is soft-deleted."
      ),
  });

export type AdminCountryOrganizationSize = z.infer<
  typeof AdminCountryOrganizationSizeSchema
>;
