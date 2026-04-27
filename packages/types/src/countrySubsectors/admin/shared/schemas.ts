import { z } from "zod";
import { CountrySubsectorBaseSchema } from "../../../baseSchemas/index.js";

export const AdminCountrySubsectorSchema = CountrySubsectorBaseSchema.extend({
  isInUse: z
    .boolean()
    .describe(
      "Whether the row is referenced by user data (organization profiling) or by other catalog records"
    ),
});

export type AdminCountrySubsector = z.infer<typeof AdminCountrySubsectorSchema>;
