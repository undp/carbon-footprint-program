import { z } from "zod";
import { CountrySectorBaseSchema } from "../../../baseSchemas/index.js";

/**
 * Admin-facing shape of a CountrySector record. Includes status, description, audit fields
 * and `impactedChildren` (drives the delete-warning dialog).
 */
export const AdminCountrySectorSchema = CountrySectorBaseSchema.extend({
  impactedChildren: z
    .object({
      activeSubsectors: z.number().int().nonnegative(),
      activeMainActivities: z.number().int().nonnegative(),
      organizationData: z.number().int().nonnegative(),
      subcategoryRecommendations: z.number().int().nonnegative(),
    })
    .describe(
      "Counts of catalog children + external references that would be impacted if this sector is soft-deleted. Used by the admin UI to show a confirmation dialog before delete."
    ),
});

export type AdminCountrySector = z.infer<typeof AdminCountrySectorSchema>;
