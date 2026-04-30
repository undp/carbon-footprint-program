import { z } from "zod";
import { CountrySubsectorBaseSchema } from "../../../baseSchemas/index.js";

export const AdminCountrySubsectorSchema = CountrySubsectorBaseSchema.extend({
  isInUse: z
    .boolean()
    .describe(
      "Whether the row is referenced by user data (organization profiling) or by other catalog records"
    ),
  impactedChildren: z
    .object({
      activeMainActivities: z.number().int().nonnegative(),
      organizationData: z.number().int().nonnegative(),
      subcategoryRecommendations: z.number().int().nonnegative(),
    })
    .describe(
      "Counts of catalog children + external references that would be impacted if this subsector is soft-deleted."
    ),
});

export type AdminCountrySubsector = z.infer<typeof AdminCountrySubsectorSchema>;
