import { z } from "zod";
import { CountrySectorBaseSchema } from "../../../baseSchemas/index.js";

/**
 * Admin-facing shape of a CountrySector record. Includes status, description, audit fields
 * and `isInUse` (used by the frontend to drive the in-use warning dialog on edits).
 */
export const AdminCountrySectorSchema = CountrySectorBaseSchema.extend({
  isInUse: z
    .boolean()
    .describe(
      "Whether the row is referenced by user data (organization profiling) or by other catalog records"
    ),
});

export type AdminCountrySector = z.infer<typeof AdminCountrySectorSchema>;
