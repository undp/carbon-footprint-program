import { z } from "zod";
import { OrganizationMainActivityBaseSchema } from "../../../baseSchemas/index.js";

/**
 * Admin-facing shape of an OrganizationMainActivity record. Includes status, description,
 * audit fields, parent display names (for the admin grid), and `isInUse`.
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
    isInUse: z
      .boolean()
      .describe(
        "Whether the row is referenced by user data (organization profiling)"
      ),
  });

export type AdminOrganizationMainActivity = z.infer<
  typeof AdminOrganizationMainActivitySchema
>;
