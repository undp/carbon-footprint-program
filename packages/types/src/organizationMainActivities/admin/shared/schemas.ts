import { z } from "zod";
import { OrganizationMainActivityBaseSchema } from "../../../baseSchemas/index.js";

/**
 * Admin-facing shape of an OrganizationMainActivity record. Includes status, description,
 * audit fields, parent display names (for the admin grid), and `impactedChildren`.
 */
export const AdminOrganizationMainActivitySchema =
  OrganizationMainActivityBaseSchema.extend({
    countrySectorName: z
      .string()
      .nullable()
      .describe("Name of the parent country sector, if any"),
    countrySubsectorName: z
      .string()
      .nullable()
      .describe("Name of the parent country subsector, if any"),
    impactedChildren: z
      .object({
        organizationData: z.number().int().nonnegative(),
      })
      .describe(
        "Counts of external references that would be impacted if this main activity is soft-deleted."
      ),
  });

export type AdminOrganizationMainActivity = z.infer<
  typeof AdminOrganizationMainActivitySchema
>;
